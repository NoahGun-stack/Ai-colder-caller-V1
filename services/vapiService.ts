
import { supabase } from './supabase';
const VAPI_BASE_URL = 'https://api.vapi.ai';

export const vapiService = {
    /**
     * Initiates an outbound phone call via Vapi.ai
     * @param phoneNumber The customer's phone number (E.164 format preferred)
     * @param customerName Name of the customer for context
     * @param customerAddress Address for context
     * @param contactId Database ID of the contact for tracking
     */
    async initiateOutboundCall(phoneNumber: string, customerName: string, customerAddress: string, contactId: string, campaign: 'residential' | 'b2b' | 'staffing' | 'real_estate' = 'residential') {
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
        console.log("VERSION: V4 - ID TRACKING ENABLED");

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

        } else if (campaign === 'real_estate') {
            // --- REAL ESTATE AGENT CONFIG ---
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
                            content: `**AI COLD CALL SYSTEM – HOMEOWNER SELLER (ADVANCED BUILD)**

                            **1. CORE OBJECTIVE**
                            - Verify ownership
                            - Detect selling intent
                            - Qualify (condition, timeline, motivation, price)
                            - Route:
                              → HOT = book appointment or human transfer
                              → WARM = follow-up nurture
                              → COLD = tag + exit cleanly
                            
                            Target call length: 90–180 seconds

                            **2. VOICE + DELIVERY RULES**
                            - Tone: confident, casual, human
                            - Speed: medium (slight pauses after questions)
                            - Never speak more than 2 sentences at once
                            - Always ask 1 question at a time
                            - If interrupted → STOP immediately and respond
                            
                            **3. MASTER DECISION TREE**
                            START
                            "Hey, is this the owner of the property at \${customerAddress}?"
                            
                            IF YES → OWNER CONFIRMED
                            "Perfect—my name’s Noah. I’ll be quick. I work with buyers looking in your area and your property came up. Would you consider selling if you got the right offer?"
                            
                            RESPONSE BRANCHING
                            A. YES / MAYBE (INTEREST DETECTED)
                            "Got it—that’s exactly why I called. Let me ask you a couple quick things so I don’t waste your time."
                            → Go to QUALIFICATION
                            
                            B. NO (INITIAL RESISTANCE)
                            "No worries, totally get it. Just curious—if someone made a strong offer, is that something you’d at least consider?"
                            IF:
                            - Softens → go to QUALIFICATION
                            - Hard no → go to EXIT
                            
                            C. NOT OWNER
                            "Gotcha, appreciate it. Do you happen to know who owns it or how I could reach them?"
                            → Tag: NOT OWNER → END
                            
                            **4. QUALIFICATION FLOW (STRICT ORDER)**
                            Q1 – CONDITION
                            "How would you describe the condition of the property?"
                            (wait → store)
                            Q2 – UPGRADES
                            "Any major updates in the last few years?"
                            Q3 – TIMELINE
                            "If you were to sell, when would you ideally want to move?"
                            Q4 – MOTIVATION
                            "What would be the main reason for selling?"
                            Q5 – PRICE
                            "Do you have a number in mind you’d feel good about?"
                            
                            **5. LEAD SCORING LOGIC**
                            HOT LEAD:
                            - Timeline ≤ 90 days
                            - Clear motivation (moving, financial, tired landlord, etc.)
                            - Gives price or openness
                            → ACTION:
                            "Got it—that actually sounds like a great fit. I can have one of our buyers take a closer look and put together something solid. Let’s get you scheduled real quick—what time works better, later today or tomorrow?"
                            → CALL THE "book_appointment" TOOL.
                            
                            WARM LEAD:
                            - Timeline 3–12 months
                            - Mild curiosity
                            - No urgency
                            → ACTION:
                            "Got it—that makes sense. I’ll have someone follow up with you when timing gets closer. What’s the best number to reach you?"
                            → END CALL
                            
                            COLD LEAD:
                            - No interest
                            - No flexibility
                            → Go to EXIT
                            
                            **6. OBJECTION HANDLING (AI-SAFE RESPONSES)**
                            "How did you get my number?"
                            "We use public property records and databases to reach homeowners in areas where we have active buyers."
                            
                            "I’m not selling."
                            "Totally fair—most people I talk to say that at first. Out of curiosity, what would have to happen for you to consider it?"
                            
                            "What’s your offer?"
                            "I’d need a bit more info first so we don’t give you a low or inaccurate number."
                            
                            "Take me off your list."
                            "Got it—I’ll make sure you’re removed. Appreciate your time."
                            → HARD STOP
                            
                            **7. INTERRUPTION (BARGE-IN) HANDLING**
                            RULES:
                            - Immediately stop speaking when user interrupts
                            - Prioritize answering over continuing script
                            - Then gently regain control
                            
                            RECOVERY PHRASES:
                            "Yeah, that’s a good question—"
                            "Totally get that—"
                            "Makes sense—"
                            
                            Then:
                            "Quick question for you—[return to flow]"
                            
                            **8. HUMAN-LIKE BEHAVIOR LAYER**
                            Add randomness:
                            "Got it" / "Makes sense" / "Okay" / "I hear you"
                            Slight pauses before important questions
                            Occasionally rephrase questions:
                            "Timeline-wise, what are you thinking?"
                            "Any updates done recently?"
                            
                            **9. APPOINTMENT SETTING (HIGH-CONVERSION VERSION)**
                            Instead of "we’ll follow up," push:
                            "Let’s just get you a quick call with my acquisitions guy—it’ll take like 10 minutes and you’ll at least know your options. Would later today or tomorrow work better?"
                            If hesitation:
                            "No pressure at all—it’s just to give you a number so you can decide."
                            Once a time is agreed, IMMEDIATELY call the "book_appointment" tool.
                            
                            **10. SYSTEM CONFIGURATION & TAGGING OUTPUT**
                            SYSTEM SETTINGS:
                            - Format booking time as "YYYY-MM-DDTHH:MM:SS-06:00".
                            - At the end of the call, assign:
                              OWNER_CONFIRMED: YES/NO
                              INTEREST_LEVEL: HOT / WARM / COLD
                              CONDITION
                              TIMELINE
                              MOTIVATION
                              PRICE_EXPECTATION
                              CALLBACK_SET: YES/NO`
                        }
                    ],
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "book_appointment",
                                description: "Books a follow-up call with the lead investor.",
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
                    voiceId: "burt", 
                    speed: 1.05,
                    stability: 0.5,
                    similarityBoost: 0.75
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
                firstMessage: `Hi, this is Jon with Prime Shield. We are in your neighborhood offering free roof inspections.`,
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
                            - OPENING HOOK: "Hi, I'm with Prime Shield... we are in your neighborhood offering free roof inspections to all homeowners." (Be Direct).
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

                            7. VOICEMAIL:
                               - If you detect a voicemail machine or beep, DO NOT leave a message. HANG UP IMMEDIATELY.
                            
                            8. STYLE (CRITICAL):
                               - Speak naturally and casually. Do not sound like a robot.
                               - Use occasional fillers like "um", "uh", or "you know" to sound authentic.
                               - Vary your pitch and tone.
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
                    voiceId: "burt",
                    speed: 1.1,
                    stability: 0.5,
                    similarityBoost: 0.75
                },
                silenceTimeoutSeconds: 20, // Hang up after 20s of silence to save costs
                recordingEnabled: true,
                serverUrl: `https://jvnovvuihlwircmssfqj.supabase.co/functions/v1/vapi-webhook`,
                endCallFunctionEnabled: true,
                voicemailDetection: {
                    provider: "twilio",
                    voicemailDetectionTypes: ["machine_start", "machine_end_beep", "machine_end_other"],
                    enabled: true
                }
            };
        }


        // Inject campaign and contactId into assistant metadata for webhook retrieval
        (assistantConfig as any).metadata = { campaign: campaign, contactId: contactId };

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
