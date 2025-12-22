
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
        const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID; // Optional if we want to use a specific assistant

        if (!apiKey) throw new Error("Missing VITE_VAPI_PRIVATE_KEY");
        if (!phoneNumberId) throw new Error("Missing VITE_VAPI_PHONE_NUMBER_ID");

        // Simple prompt config if no assistant ID is provided
        const assistantOverrides = {
            firstMessage: `Hello, is this ${customerName}?`,
            model: {
                provider: "openai",
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are a friendly but persistent roofing sales representative for RoofPulse AI. Your goal is to book a free roof inspection. You are speaking with ${customerName}. Keep responses concise and conversational.`
                    }
                ]
            },
            voice: {
                provider: "11labs",
                voiceId: "burt" // Standard male voice, change as needed
            }
        };

        const payload = {
            phoneNumberId: phoneNumberId,
            customer: {
                number: phoneNumber,
                name: customerName
            },
            assistant: assistantId ? { assistantId } : assistantOverrides
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

        return await response.json(); // Returns call details including callId
    }
};
