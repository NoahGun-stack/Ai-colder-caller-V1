
import { supabase } from './supabase';
const VAPI_BASE_URL = 'https://api.vapi.ai';

export const vapiService = {
    /**
     * Initiates an outbound phone call via Vapi.ai
     * @param phoneNumber The customer's phone number (E.164 format preferred)
     * @param customerName Name of the customer for context
     */
    async initiateOutboundCall(phoneNumber: string, customerName: string) {
        const apiKey = import.meta.env.VITE_VAPI_PRIVATE_KEY;
        const phoneNumberId = import.meta.env.VITE_VAPI_PHONE_NUMBER_ID;
        const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
        const publicUrl = import.meta.env.VITE_PUBLIC_URL;

        if (!apiKey) throw new Error("Missing VITE_VAPI_PRIVATE_KEY");
        if (!phoneNumberId) throw new Error("Missing VITE_VAPI_PHONE_NUMBER_ID");

        // 1. DNC Check
        // Normalize number to check last 10 digits
        const normalizedCheck = phoneNumber.replace(/\D/g, '').slice(-10);

        // We check for exact match or suffix match in the user's DNC list
        // Since RLS is on, we can only see our own DNC list
        const { data: dncRecord } = await supabase
            .from('dnc_list')
            .select('id')
            .ilike('phoneNumber', `%${normalizedCheck}`) // Check if number ends with these digits
            .maybeSingle();

        if (dncRecord) {
            throw new Error(`Call Blocked: Number is in your DNC list.`);
        }

        // Get current time in EST for context
        const now = new Date();
        const estDate = now.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const estTime = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });

        // Define Tool for Appointment Booking
        const assistantWithTools = {
            firstMessage: `Hello, is this ${customerName}?`,
            model: {
                provider: "openai",
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are a friendly but persistent roofing sales representative for RoofPulse. Your goal is to book a free roof inspection. You are speaking with ${customerName}. 
                        
                        CONTEXT:
                        - Today is: ${estDate}
                        - Current Time: ${estTime}

                        INSTRUCTIONS:
                        1. If they agree to an appointment, ask for a time.
                        2. Book for the EXACT time they say.
                        3. Format as "YYYY-MM-DDTHH:MM:SS".
                        4. DO NOT convert to UTC. DO NOT apply timezone offsets.
                        5. If they say "8pm", send "${now.getFullYear()}-...T20:00:00".`
                    }
                ],
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "book_appointment",
                            description: "Books a roof inspection appointment.",
                            parameters: {
                                type: "object",
                                properties: {
                                    datetime: { type: "string", description: "ISO 8601 datetime (e.g. 2024-12-25T10:00:00Z)" },
                                    notes: { type: "string" }
                                },
                                required: ["datetime"]
                            }
                        },
                        async: false, // Wait for our response
                        server: { url: `${publicUrl}/vapi-webhook` } // Use our local tunnel
                    }
                ]
            },
            voice: {
                provider: "11labs",
                voiceId: "burt"
            },
            recordingEnabled: true, // Enable Recording
            serverUrl: `${publicUrl}/vapi-webhook`, // Send end-of-call-report here
            endCallFunctionEnabled: true // Explicitly enable end-call reports
        };

        const payload = {
            phoneNumberId: phoneNumberId,
            customer: {
                number: phoneNumber,
                name: customerName
            },
            assistant: assistantWithTools // Use the config with tools
        };

        const response = await fetch(`${VAPI_BASE_URL}/call`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to initiate call");
        }

        return await response.json();
    }
};
