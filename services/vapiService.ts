
import { supabase } from './supabase';
const VAPI_BASE_URL = 'https://api.vapi.ai';

export const vapiService = {
    /**
     * Initiates an outbound phone call via Vapi.ai
     * @param phoneNumber The customer's phone number (E.164 format preferred)
     * @param customerName Name of the customer for context
     */
    async initiateOutboundCall(phoneNumber: string, customerName: string, customerAddress: string, campaign: 'residential' | 'b2b' | 'staffing' = 'residential') {
        const apiKey = import.meta.env.VITE_VAPI_PRIVATE_KEY;
        const phoneNumberId = import.meta.env.VITE_VAPI_PHONE_NUMBER_ID_ACTIVE;
        const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;

        console.log("DEBUG: config", { phoneNumberId, apiKey: apiKey ? 'Set' : 'Missing', campaign });

        // Normalize Phone Number to E.164 (+1XXXXXXXXXX)
        const digits = phoneNumber.replace(/\D/g, '');
        let formattedNumber = digits;
        if (digits.length === 10) {
            formattedNumber = `+1${digits}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
            formattedNumber = `+${digits}`;
        } else {
            formattedNumber = `+${digits}`;
        }

        console.log(`Initiating Vapi Call to ${formattedNumber} (Original: ${phoneNumber})`);
        console.log("VERSION: V3 - TRIPLE OUTREACH (Email Removed)");

        if (!apiKey) throw new Error("Missing VITE_VAPI_PRIVATE_KEY");
        if (!phoneNumberId) throw new Error("Missing VITE_VAPI_PHONE_NUMBER_ID_ACTIVE");

        // Get current time in EST for context
        const now = new Date();
        const estDate = now.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const estTime = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });

        let assistantConfig;

        if (campaign === 'b2b') {
            // --- B2B SALES AGENT CONFIG ---
            assistantConfig = {
                firstMessage: `Hi, is this ${customerName}? (V3)`,
                transcriber: {
                    provider: "deepgram",
                    model: "nova-2",
                    language: "en-US"
                },
                model: {
                    provider: "openai",
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: `You are Alex, a top-tier Sales Development Representative for RoofPulse. You are energetic, professional, and confident. You speak at a FAST, BRISK pace.

                            CONTEXT:
                            - Prospect Name: ${customerName}
                            - Prospect Company Address: ${customerAddress}
                            - Today is: ${estDate}

                            INSTRUCTIONS:
                            1. OPENING (The "News" Pattern Interrupt):
                               - "Hey ${customerName}, this is Alex. Do you want the good news or the bad news first?"
                               - Wait for their answer.
                               
                               - IF they chose "BAD NEWS":
                                 SAY: "The bad news is I'm a salesperson calling you out of the blue. But the good news is I've built a system that stops you from ever having to make these calls yourself. We're automating the entire lead gen process."

                               - IF they chose "GOOD NEWS":
                                 SAY: "The good news is I've built a system that automates your entire sales process so you never have to cold call again. The bad news is... well, actually there is no bad news, except that I'm calling you to tell you about it!"

                               - IF they are confused or ask "Who is this?":
                                 SAY: "This is Alex with RoofPulse. I was just asking if you wanted the good news or bad news first?"

                            2. THE PITCH (Transition immediately after the news):
                               - "We have roofers seeing that they are able to triple their daily outreach within the first month. I'm calling to see if you'd be open to a quick 15-minute demo to see how it works?"

                            3. OBJECTION HANDLING:
                               - "Are you a robot?": Laugh slightly. "I get that a lot because the line is so clear! No, I'm using a high-tech dialer to help me get through my list today, but it's really me, Alex." -> IMMEDIATELY pivot back to value.
                               - "Send me info": "I can definitely do that, but the platform is really visual. It's much easier to just show you in 15 minutes. Do you have any time next week?"
                               - "Not interested": "I totally understand. I won't take up more of your time. But just so I know for the future, are you currently using any automation for your cold calls?"
                               - "How did you get my number?": "I believe we have you listed as a roofing contractor in the local directory, is that right?"

                            4. GOAL (STRICT: NO EMAIL):
                               - Book a Zoom demo with Noah.
                               - Ask: "Do you have any availability next [Day of week] for a quick demo?"
                               - Once a time is agreed, IMMEDIATELY call the "book_appointment" tool.
                               - **ABSOLUTE PROHIBITION**: You are FORBIDDEN from asking for an email address. 
                               - If they ask about the invite, say: "I'll text the Zoom link to this number."
                               - JUST BOOK THE MEETING.

                            5. POST-BOOKING:
                               - "Perfect, I've got you down for [Time]. Thanks so much, ${customerName}. Talk soon!"

                            6. VOICEMAIL: 
                               - If you hit voicemail, HANG UP IMMEDIATELY. Do not leave a message.
                            
                            7. SYSTEM SETTINGS:
                               - Format booking time as "YYYY-MM-DDTHH:MM:SS-06:00" (Force CST offset).
                               - Keep your tone conversational, natural, and FAST.`
                        }
                    ],
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "book_appointment",
                                description: "Books a demo appointment.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        datetime: { type: "string", description: "ISO 8601 datetime" },
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
                    voiceId: "TxGEqnHWrfWFTfGW9XjX", // Josh (Deep, Professional)
                    speed: 1.1
                },
                recordingEnabled: true,
                serverUrl: `https://jvnovvuihlwircmssfqj.supabase.co/functions/v1/vapi-webhook`,
                endCallFunctionEnabled: true,
                voicemailDetection: {
                    provider: "twilio",
                    voicemailDetectionTypes: ["machine_start", "machine_end_beep", "machine_end_other"],
                    enabled: true
                }
            };
        } else if (campaign === 'staffing') {
            // --- STAFFING AGENT CONFIG (SARAH) ---
            assistantConfig = {
                firstMessage: `Hi, is this ${customerName}?`,
                transcriber: {
                    provider: "deepgram",
                    model: "nova-2",
                    language: "en-US"
                },
                model: {
                    provider: "openai",
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: `You are Sarah, a professional recruiter for ProTrade Staffing. You are polite, efficient, and solution-oriented. You are calling to offer on-demand skilled labor to contractors.
                            
                            CONTEXT:
                            - Prospect Name: ${customerName}
                            - Prospect Company: ${customerAddress} (Assuming Company Name/Address)
                            - Today is: ${estDate}

                            INSTRUCTIONS:
                            1. OPENING (Make it personal):
                               - "Hi, is this ${customerName}?"
                               - Once confirmed: "Hi ${customerName}, this is Sarah with ProTrade Staffing. How is your week going so far?"
                               - WAIT for their response and acknowledge it naturally (e.g., "Glad to hear that," or "I hear you, it's that time of year").

                            2. THE BRIDGE (Keep it short):
                               - "I know you're busy, so I'll be brief. I see you guys are growing, and I just wanted to see if you're looking for any extra help with installs or service calls right now?"

                            3. THE PITCH (Only if they ask or show interest):
                               - "We specialize in on-demand HVAC and construction crews. We're different because all our guys are fully vetted and ready to go immediately. We just help you handle the overflow."

                            3. PRE-BOOKING (EMAIL REQUIRED):
                               - If they show interest: "That's great. We have a roster of available crews I can share with you. I'd love to set up a quick 10-minute call with our account manager, Noah, to see if we're a good fit."
                               - "What is the best email address to send the calendar invite to?"
                               - **VERIFICATION**: Verify spelling of the email.

                            4. OBJECTION HANDLING:
                               - "We have curren crews": "That's fantastic. We usually work as a backup for when your main crews are overbooked or you take on a large commercial job. It never hurts to have a backup, right?"
                               - "How much?": "Rates vary by trade, but we are very competitive. Noah can walk you through the rate sheet in about 5 minutes."

                            5. GOAL:
                               - Book a meeting with Noah.
                               - Collect Email -> Verify Email -> Agree on Time -> Call "book_appointment".

                            6. POST-BOOKING:
                               - "Perfect. I've sent the invite to [Email]. Noah looks forward to speaking with you!"

                            7. SYSTEM SETTINGS:
                               - Format booking time as "YYYY-MM-DDTHH:MM:SS-06:00".`
                        }
                    ],
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "book_appointment",
                                description: "Books a meeting with Noah.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        datetime: { type: "string", description: "ISO 8601 datetime" },
                                        email: { type: "string", description: "Verified email address" },
                                        notes: { type: "string" }
                                    },
                                    required: ["datetime", "email"]
                                }
                            },
                            async: false,
                            server: { url: `https://jvnovvuihlwircmssfqj.supabase.co/functions/v1/vapi-webhook` }
                        }
                    ]
                },
                voice: {
                    provider: "11labs",
                    voiceId: "EXAVITQu4vr4xnSDxMaL" // Bella (Professional Female)
                },
                recordingEnabled: true,
                serverUrl: `https://jvnovvuihlwircmssfqj.supabase.co/functions/v1/vapi-webhook`,
                endCallFunctionEnabled: true,
                voicemailDetection: {
                    provider: "twilio",
                    voicemailDetectionTypes: ["machine_start", "machine_end_beep", "machine_end_other"],
                    enabled: true
                }
            };
        } else {
            // --- RESIDENTIAL HOMEOWNER AGENT CONFIG (DEFAULT) ---
            assistantConfig = {
                firstMessage: `Hi, I'm with Prime Shield and I wanted to see if you'd be interested in a free roof inspection.`,
                transcriber: {
                    provider: "deepgram",
                    model: "nova-2",
                    language: "en-US"
                },
                model: {
                    provider: "openai",
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: `You are Jon from Prime Shield. Your goal is to book a free roof inspection with ${customerName}.
                            
                            CONTEXT:
                            - Location: ${customerAddress} (We serve Austin, Cedar Park, and surrounding areas)
                            - Date: ${estDate}
                            - Time: ${estTime}
    
                            TRAINING DATA (TOP PERFORMER SCRIPT):
                            - OPENING HOOK: "Hi, I'm with Prime Shield... I wanted to see if you'd be interested in a free roof inspection." (Be Direct).
                            - THE "WHY": "Over time roofs can develop issues like leaks or wear and tear that may not be obvious at first. Our inspection help catch potential problems early before they turn into costly repairs."
                            - INSURANCE OBJECTION: "The inspection is completely free with no obligation. We do work with insurance companies if any issues are found, especially after events like hailstorms."
                            - CLOSING: "Would you like us to take a quick look at your roof for free?" -> "What day and time works best for you?"

                            INSTRUCTIONS:
                            1. OPENING: Use the hook above. If they ask who/why, use the "WHY" explanation.
                            
                            2. SERVICE AREA: If they ask if you serve their area: "Yes absolutely. We do offer roof inspections in Austin and Cedar Park."

                            3. ESTABLISH INTEREST FIRST:
                               - ASK: "Would you like us to stop by and take a look? It's completely free."
                               - IF YES: Proceed to step 4.
                               - IF NO: Pivot once, then end.

                            4. BOOKING TENTATIVE:
                               - "Great! What day works best for you?"
                               - Once they give a day/time: "Okay, I can get that locked in for [Time]."
                            
                            5. QUALIFICATION (Softly Transition):
                               - "Just to make sure we're prepared for the inspection, I have a few quick questions while I finish scheduling."
                               - Q1: "How old is the roof approximately?"
                               - Q2: "You are the homeowner there, correct?"
                               - Q3: "Do you have homeowners insurance?" 
                                 * IF YES: "Who is the carrier?"
                                 * IF NO: "We offer $0 down financing."
                               - Q4: "Last one: Is it Shingle, Metal, or Tile?"

                            6. FINALIZE:
                               - "Perfect. I have you all set for [Time]. We'll see you then!"
                               - CALL tool 'book_appointment'.
                            `
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
                        },
                        {
                            type: "function",
                            function: {
                                name: "update_address",
                                description: "Updates the customer's property address if incorrect.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        new_address: { type: "string", description: "The full corrected address provided by the user." }
                                    },
                                    required: ["new_address"]
                                }
                            },
                            async: false,
                            server: { url: `https://jvnovvuihlwircmssfqj.supabase.co/functions/v1/vapi-webhook` }
                        }
                    ]
                },
                voice: {
                    provider: "11labs",
                    voiceId: "TxGEqnHWrfWFTfGW9XjX" // Josh (Deep, Professional)
                },
                recordingEnabled: true, // Enable Recording
                serverUrl: `https://jvnovvuihlwircmssfqj.supabase.co/functions/v1/vapi-webhook`, // Send end-of-call-report here
                endCallFunctionEnabled: true, // Explicitly enable end-call reports
                voicemailDetection: {
                    provider: "twilio",
                    voicemailDetectionTypes: ["machine_start", "machine_end_beep", "machine_end_other"],
                    enabled: true
                }
            };
        }

        // Inject campaign into assistant metadata for webhook retrieval
        (assistantConfig as any).metadata = { campaign: campaign };

        const payload = {
            phoneNumberId: phoneNumberId,
            customer: {
                number: formattedNumber,
                name: customerName
            },
            assistant: assistantConfig
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
