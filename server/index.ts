import Fastify from 'fastify';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import cors from '@fastify/cors';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const {
    VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY
} = process.env;

if (!VITE_SUPABASE_URL || (!VITE_SUPABASE_ANON_KEY && !SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('Missing Supabase variables!');
    process.exit(1);
}

const fastify = Fastify();

// Use Service Role Key if available (for Backend), otherwise fallback to Anon
const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(VITE_SUPABASE_URL, supabaseKey);

fastify.register(fastifyFormBody);
fastify.register(cors, { origin: '*' });

// ROOT
fastify.get('/', async () => {
    return { status: 'alive', message: 'RoofPulse Vapi Webhook Server' };
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
                // 1. Find Contact
                const { data: candidates, error: findError } = await supabase
                    .from('contacts')
                    .select('id, phoneNumber, address, city, state, zip')
                    .ilike('phoneNumber', `%${last4}%`);

                if (findError) throw findError;

                // Filter in JS
                const contact = candidates?.find(c => {
                    const dbPhone = (c.phoneNumber || '').replace(/\D/g, '').slice(-10);
                    return dbPhone === normalizedPhone;
                });

                if (!contact) {
                    return reply.send({
                        results: [{
                            toolCallId: toolCall.id,
                            result: "Error: Contact not found in database. Ask user for their phone number to confirm."
                        }]
                    });
                }

                // 2. Insert Appointment
                const addressStr = contact.address ? `${contact.address}, ${contact.city}, ${contact.state} ${contact.zip}` : 'Address Not on File';
                const fullNotes = `Address: ${addressStr}\n\n${args.notes || ''}`;

                const { error: insertError } = await supabase.from('appointments').insert({
                    contact_id: contact.id,
                    datetime: args.datetime,
                    notes: fullNotes
                });

                if (insertError) {
                    return reply.send({
                        results: [{
                            toolCallId: toolCall.id,
                            result: `Error: ${insertError.message}`
                        }]
                    });
                }

                // 3. Update Contact Status
                const { error: updateError } = await supabase
                    .from('contacts')
                    .update({ status: 'Appointment Booked' })
                    .eq('id', contact.id);

                if (updateError) console.error('Failed to update contact status:', updateError);

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

        const phoneNumber = call.customer.number;
        const normalizedPhone = phoneNumber.replace(/\D/g, '').slice(-10);
        const last4 = normalizedPhone.slice(-4);

        try {
            const { data: contacts } = await supabase
                .from('contacts')
                .select('id, status')
                .ilike('phoneNumber', `%${last4}%`);

            const contact = contacts?.[0]; // Rough match OK for logs

            if (contact) {
                await supabase.from('call_logs').insert({
                    contact_id: contact.id,
                    duration: call.duration || 0,
                    outcome: call.endedReason || 'Completed',
                    recording_url: recordingUrl,
                    transcript: message.transcript || message.summary || 'No transcript available',
                    sentiment: message.analysis?.sentiment || 'Neutral'
                });
                console.log('Call Log Saved with Recording:', recordingUrl);

                // Update Status if not already booked
                // If duration > 0, it's a "Connect", otherwise just "Attempted" unless already connected
                const newStatus = (call.duration || 0) > 0 ? 'Connected' : 'Attempted';

                await supabase.rpc('update_contact_status_if_needed', {
                    contact_uuid: contact.id,
                    new_status: newStatus
                });
            }
        } catch (e) {
            console.error('Error saving call log:', e);
        }
        return reply.send({ success: true });
    }

    return reply.send({ message: 'No tool executed' });
});

const PORT = 5050;
fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`RoofPulse Vapi Server listening on ${address}`);
});
