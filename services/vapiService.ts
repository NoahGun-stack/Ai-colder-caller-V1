
import { supabase } from './supabase';
const VAPI_BASE_URL = 'https://api.vapi.ai';

export const vapiService = {
    /**
     * Initiates an outbound phone call via Vapi.ai
     * @param phoneNumber The customer's phone number (E.164 format preferred)
     * @param customerName Name of the customer for context
     */
    async initiateOutboundCall(phoneNumber: string, customerName: string, customerAddress: string) {
        const apiKey = import.meta.env.VITE_VAPI_PRIVATE_KEY;
        const phoneNumberId = import.meta.env.VITE_VAPI_PHONE_NUMBER_ID;
        const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;

        // Normalize Phone Number to E.164 (+1XXXXXXXXXX)
        // 1. Remove non-digits
        const digits = phoneNumber.replace(/\D/g, '');
        // 2. Ensure it has 11 digits starting with 1, or 10 digits (assume US +1)
        let formattedNumber = digits;
        if (digits.length === 10) {
            formattedNumber = `+1${digits}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
            formattedNumber = `+${digits}`;
        } else {
            // Fallback: Just try adding + if missing, or leave as is if unique global format
            // but for US-centric usage, this covers 99% of cases.
            formattedNumber = `+${digits}`;
        }

        console.log(`Initiating Vapi Call to ${formattedNumber} (Original: ${phoneNumber})`);

        if (!apiKey) throw new Error("Missing VITE_VAPI_PRIVATE_KEY");
        if (!phoneNumberId) throw new Error("Missing VITE_VAPI_PHONE_NUMBER_ID");



        // Get current time in EST for context
        const now = new Date();
        const estDate = now.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const estTime = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });

        // Define Tool for Appointment Booking
        const assistantWithTools = {
            firstMessage: `Hello, this is Jon with Amp Roofing, am I speaking with ${customerName}?`,
            model: {
                provider: "openai",
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are Jon from Amp Roofing, a friendly but persistent roofing sales representative. Your goal is to book a free roof inspection. You are speaking with ${customerName}. 
                        
                        CONTEXT:
                        - Today is: ${estDate}
                        - Current Time: ${estTime}
                        - Customer Address: ${customerAddress}

                        INSTRUCTIONS:
                        1. If they agree to an appointment, you MUST confirm their address matches: ${customerAddress}.
                        2. Ask for a specific time for the inspection.
                        3. Book for the EXACT time they say.
                        4. Format booking time as "YYYY-MM-DDTHH:MM:SS-05:00" (Force EST offset).`
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
                        async: false,
                        server: { url: `https://jvnovvuihlwircmssfqj.supabase.co/functions/v1/vapi-webhook` }
                    }
                ]
            },
            voice: {
                provider: "11labs",
                voiceId: "burt"
            },
            recordingEnabled: true, // Enable Recording
            serverUrl: `https://jvnovvuihlwircmssfqj.supabase.co/functions/v1/vapi-webhook`, // Send end-of-call-report here
            endCallFunctionEnabled: true // Explicitly enable end-call reports
        };

        const payload = {
            phoneNumberId: phoneNumberId,
            customer: {
                number: formattedNumber,
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
