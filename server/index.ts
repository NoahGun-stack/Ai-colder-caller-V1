import Fastify from 'fastify';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import Twilio from 'twilio';
import cors from '@fastify/cors';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    OPENAI_API_KEY,
    VITE_OPENAI_API_KEY, // Reading VITE var
    PUBLIC_URL,
    VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY
} = process.env;

// Map VITE vars if standard ones are missing
const FINAL_OPENAI_KEY = OPENAI_API_KEY || VITE_OPENAI_API_KEY;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !FINAL_OPENAI_KEY) {
    console.error('Missing Twilio or OpenAI environment variables!');
    process.exit(1);
}

if (!VITE_SUPABASE_URL || (!VITE_SUPABASE_ANON_KEY && !SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('Missing Supabase variables!');
    process.exit(1);
}

const fastify = Fastify();
const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
// Use Service Role Key if available (for Backend), otherwise fallback to Anon (which will fail for protected writes)
const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(VITE_SUPABASE_URL, supabaseKey);

fastify.register(fastifyFormBody);
fastify.register(fastifyWs);
fastify.register(cors, { origin: '*' });

const SYSTEM_MESSAGE = `
You are a helpful and polite AI assistant for a roofing company called RoofPulse. 
Your goal is to qualify leads and book a free roof inspection appointment.
When a user agrees to an appointment, ask for the preferred date and time, and then use the 'book_appointment' tool to save it.
Keep your responses short and conversational.
`;

const TOOLS_DEF = [
    {
        type: 'function',
        name: 'book_appointment',
        description: 'Book a roof inspection appointment for the customer.',
        parameters: {
            type: 'object',
            properties: {
                datetime: {
                    type: 'string',
                    description: 'The date and time for the appointment (ISO 8601 format, e.g., 2024-01-01T14:00:00Z). Convert relative times like "tomorrow at 2pm" to absolute ISO format.'
                },
                notes: {
                    type: 'string',
                    description: 'Any special notes or context for the appointment.'
                }
            },
            required: ['datetime']
        }
    }
];

// ROOT
fastify.get('/', async () => {
    return { status: 'alive', message: 'Twilio Media Stream Server' };
});

// START CALL
fastify.post('/outbound-call', async (request: any, reply) => {
    const { number, contactId } = request.body;
    const url = PUBLIC_URL || `https://${request.headers.host}`;

    if (!number) return reply.code(400).send({ error: 'Missing phone number' });

    try {
        const call = await client.calls.create({
            to: number,
            from: TWILIO_PHONE_NUMBER,
            url: `${url}/incoming-call?contactId=${contactId || ''}`,
            record: true // ENABLE RECORDING
        });
        reply.send({ success: true, callSid: call.sid });
    } catch (error: any) {
        console.error('Twilio Error:', error);
        reply.code(500).send({ error: error.message });
    }
});

// INCOMING WEBHOOK (Returns TwiML)
fastify.all('/incoming-call', async (request: any, reply) => {
    const { contactId } = request.query;
    const url = PUBLIC_URL || `https://${request.headers.host}`;
    // Pass contactId to the WebSocket URL
    const wssUrl = `${url.replace('https', 'wss')}/media-stream?contactId=${contactId || ''}`;

    const twiml = `
    <Response>
        <Say>Please wait while we connect you with the agent.</Say>
        <Connect>
            <Stream url="${wssUrl}" />
        </Connect>
    </Response>
    `;

    reply.type('text/xml').send(twiml);
});

// VAPI WEBHOOK (Tool Execution)
fastify.post('/vapi-webhook', async (request: any, reply) => {
    console.log('Vapi Webhook Triggered:', request.body);
    const { message } = request.body;

    // Check if it's a tool call
    if (message && message.type === 'tool-calls') {
        const toolCall = message.toolCalls[0];
        console.log('Tool Call Details:', JSON.stringify(toolCall, null, 2));

        if (toolCall.function.name === 'book_appointment') {
            let args = toolCall.function.arguments;
            if (typeof args === 'string') {
                try {
                    args = JSON.parse(args);
                } catch (e) {
                    console.error('Error parsing arguments JSON:', e);
                }
            }
            const call = message.call;
            const rawPhoneNumber = call.customer.number;

            // Normalize phone: remove all non-digits, take last 10 digits
            // specific for US numbers to match (617) vs +1 617
            const normalizedPhone = rawPhoneNumber.replace(/\D/g, '').slice(-10);

            console.log(`Booking for Raw: ${rawPhoneNumber}, Normalized: ${normalizedPhone}`, args);

            try {
                const last4 = normalizedPhone.slice(-4);

                console.log(`Booking for Raw: ${rawPhoneNumber}, Normalized: ${normalizedPhone}, Last4: ${last4}`, args);

                // 1. Find Contact (Robust Match)
                // Fetch anyone with matching last 4 digits (avoids formatting issues)
                // Note: Column is "phoneNumber" in DB schema
                const { data: candidates, error: findError } = await supabase
                    .from('contacts')
                    .select('id, phoneNumber, address, city, state, zip')
                    .ilike('phoneNumber', `%${last4}%`);

                if (findError) {
                    console.error('Supabase Search Error:', findError);
                    throw findError;
                }

                // Filter in JS to find exact match on last 10 digits
                const contact = candidates?.find(c => {
                    const dbPhone = (c.phoneNumber || '').replace(/\D/g, '').slice(-10);
                    return dbPhone === normalizedPhone;
                });

                if (!contact) {
                    console.error('Contact Not Found (JS Filter Refined) for:', normalizedPhone);
                    // Helpful log: show what we found
                    console.log('Candidates were:', candidates?.map(c => c.phoneNumber));

                    return reply.send({
                        results: [{
                            toolCallId: toolCall.id,
                            result: "Error: Contact not found in database. Ask user for their phone number to confirm."
                        }]
                    });
                }

                // 2. Insert Appointment
                // Use address from DB
                const addressStr = contact.address ? `${contact.address}, ${contact.city}, ${contact.state} ${contact.zip}` : 'Address Not on File';
                const fullNotes = `Address: ${addressStr}\n\n${args.notes || ''}`;

                const { error: insertError } = await supabase.from('appointments').insert({
                    contact_id: contact.id,
                    datetime: args.datetime,
                    notes: fullNotes
                });

                if (insertError) {
                    console.error('Supabase Insert Error:', insertError);
                    return reply.send({
                        results: [{
                            toolCallId: toolCall.id,
                            result: `Error: ${insertError.message}`
                        }]
                    });
                }

                // 3. Success
                return reply.send({
                    results: [{
                        toolCallId: toolCall.id,
                        result: "Appointment booked successfully. Confirm this to the user."
                    }]
                });

            } catch (err: any) {
                console.error(err);
                return reply.code(500).send({ error: err.message });
            }
        }
    }

    // Handle End of Call Report (Recording)
    if (message && message.type === 'end-of-call-report') {
        console.log('End of Call Report:', JSON.stringify(message, null, 2));
        const call = message.call;
        const recordingUrl = message.recordingUrl || message.stereoRecordingUrl;

        // Try to find contact based on phone number again or use metadata if we passed it
        // Ideally Vapi lets us pass metadata, but for now we look up by phone (customer.number)
        const phoneNumber = call.customer.number;
        const normalizedPhone = phoneNumber.replace(/\D/g, '').slice(-10);
        const last4 = normalizedPhone.slice(-4);

        try {
            // Find Contact to link log
            const { data: contacts } = await supabase
                .from('contacts')
                .select('id')
                .ilike('phoneNumber', `%${last4}%`);

            const contact = contacts?.[0]; // Rough match is fine for logs

            if (contact) {
                const { error } = await supabase.from('call_logs').insert({
                    contact_id: contact.id,
                    duration: call.duration || 0,
                    outcome: call.endedReason || 'Completed',
                    recording_url: recordingUrl,
                    transcript: message.transcript || message.summary || 'No transcript available',
                    sentiment: message.analysis?.sentiment || 'Neutral'
                });

                if (error) console.error('Failed to save call log:', error);
                else console.log('Call Log Saved with Recording:', recordingUrl);
            }
        } catch (e) {
            console.error('Error saving call log:', e);
        }

        return reply.send({ success: true });
    }

    return reply.send({ message: 'No tool executed' });
});

// WEBSOCKET HANDLER
fastify.register(async (fastify) => {
    fastify.get('/media-stream', { websocket: true }, (connection, req: any) => {
        console.log('Client connected to media stream');

        // Extract Contact ID from Query Params
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const currentContactId = urlParams.get('contactId');
        console.log('Target Contact ID:', currentContactId);

        const openAiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "OpenAI-Beta": "realtime=v1"
            }
        });

        let streamSid: string | null = null;
        let vadEnabled = false;

        const sendSessionUpdate = () => {
            const sessionUpdate = {
                type: 'session.update',
                session: {
                    turn_detection: null, // Start "Deaf" / manual
                    input_audio_format: 'g711_ulaw',
                    output_audio_format: 'g711_ulaw',
                    voice: 'alloy',
                    instructions: SYSTEM_MESSAGE,
                    tools: TOOLS_DEF,
                    tool_choice: 'auto'
                }
            };
            openAiWs.send(JSON.stringify(sessionUpdate));
        };

        // OPENAI EVENTS
        openAiWs.on('open', () => {
            console.log('Connected to OpenAI Realtime API');
            setTimeout(sendSessionUpdate, 250);
        });

        openAiWs.on('message', async (data: any) => {
            try {
                const response = JSON.parse(data);

                // LOGGING
                if (response.type === 'error') {
                    console.error('OpenAI Error:', response.error);
                } else if (['response.audio.delta', 'response.audio_transcript.delta'].includes(response.type)) {
                    // Reduce noise in logs
                } else {
                    console.log('OpenAI Event:', response.type);
                }

                // GREETING TRIGGER
                if (response.type === 'session.updated' && !vadEnabled) {
                    console.log('Session Configured. Triggering Initial Greeting...');
                    const responseCreate = {
                        type: 'response.create',
                        response: {
                            modalities: ['text', 'audio'],
                            instructions: 'Say "Hello, this is [Name] from RoofPulse. Am I speaking with the homeowner?"'
                        }
                    };
                    openAiWs.send(JSON.stringify(responseCreate));
                }

                // RE-ENABLE VAD AFTER FIRST GREETING
                if (response.type === 'response.done' && !vadEnabled) {
                    console.log('Greeting Done. Enabling VAD.');
                    vadEnabled = true;
                    const enableVad = {
                        type: 'session.update',
                        session: {
                            turn_detection: {
                                type: 'server_vad',
                                threshold: 0.6,
                                silence_duration_ms: 600,
                                create_response: true
                            }
                        }
                    };
                    openAiWs.send(JSON.stringify(enableVad));
                }

                // TOOL CALL HANDLING
                if (response.type === 'response.function_call_arguments.done') {
                    console.log('Function Call Triggered:', response.name);
                    const args = JSON.parse(response.arguments);
                    let result = { success: false, message: 'Unknown Error' };

                    if (response.name === 'book_appointment') {
                        if (currentContactId) {
                            console.log('Booking for Contact:', currentContactId, args);
                            const { error } = await supabase.from('appointments').insert({
                                contact_id: currentContactId,
                                datetime: args.datetime,
                                notes: args.notes || ''
                            });

                            if (error) {
                                console.error('Supabase Error:', error);
                                result = { success: false, message: 'Database Error: ' + error.message };
                            } else {
                                result = { success: true, message: 'Appointment Booked Successfully.' };
                            }
                        } else {
                            result = { success: false, message: 'No Contact ID associated with this call.' };
                        }
                    }

                    // Send Output back to AI
                    const itemCreate = {
                        type: 'conversation.item.create',
                        item: {
                            type: 'function_call_output',
                            call_id: response.call_id,
                            output: JSON.stringify(result)
                        }
                    };
                    openAiWs.send(JSON.stringify(itemCreate));

                    // Trigger AI to confirm to user
                    const responseCreate = {
                        type: 'response.create',
                        response: { modalities: ['text', 'audio'] }
                    };
                    openAiWs.send(JSON.stringify(responseCreate));
                }

                // AUDIO PLAYBACK
                if (response.type === 'response.audio.delta' && response.delta) {
                    if (streamSid) {
                        const audioDelta = {
                            event: 'media',
                            streamSid: streamSid,
                            media: { payload: response.delta }
                        };
                        connection.send(JSON.stringify(audioDelta));
                    }
                }

            } catch (e) {
                console.error('Error parsing OpenAI message:', e, data.toString());
            }
        });

        // TWILIO EVENTS
        connection.on('message', (message: any) => {
            try {
                const data = JSON.parse(message);

                if (data.event === 'start') {
                    streamSid = data.start.streamSid;
                    console.log('Incoming Stream Started:', streamSid);
                } else if (data.event === 'media' && openAiWs.readyState === WebSocket.OPEN) {
                    const audioAppend = {
                        type: 'input_audio_buffer.append',
                        audio: data.media.payload
                    };
                    openAiWs.send(JSON.stringify(audioAppend));
                } else if (data.event === 'stop') {
                    console.log('Stream stopped');
                    if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
                }
            } catch (e) {
                console.error('Error parsing Twilio message:', e);
            }
        });

        connection.on('close', () => {
            if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
            console.log('Client disconnected');
        });
    });
});

const PORT = 5050;
fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Twilio Relay Server listening on ${address}`);
});
