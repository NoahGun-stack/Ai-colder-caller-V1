
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

        // Define Tool for Appointment Booking
        const assistantWithTools = {
            firstMessage: `Hello, is this ${customerName}?`,
            model: {
                provider: "openai",
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are a friendly but persistent roofing sales representative for RoofPulse. Your goal is to book a free roof inspection. You are speaking with ${customerName}. If they agree, ask for a time and use the book_appointment tool.`
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
