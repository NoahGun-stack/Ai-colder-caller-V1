
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const VAPI_BASE_URL = 'https://api.vapi.ai';
const VAPI_KEY = process.env.VITE_VAPI_PRIVATE_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    if (!VAPI_KEY) {
        console.error("Missing Vapi Key");
        return;
    }

    console.log("Fetching latest call from Vapi...");
    const response = await fetch(`${VAPI_BASE_URL}/call?limit=1`, {
        headers: {
            'Authorization': `Bearer ${VAPI_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        console.error("Vapi Error:", await response.text());
        return;
    }

    const calls = await response.json();
    if (!calls || calls.length === 0) {
        console.log("No calls found.");
        return;
    }

    const call = calls[0];
    console.log("Found Call ID:", call.id);
    console.log("Created At:", call.createdAt);
    console.log("Customer:", call.customer?.number);
    console.log("Status:", call.status);
    console.log("Analysis:", JSON.stringify(call.analysis, null, 2));

    // Check if we should save this (ask user or just do it?)
    // For now, let's just try to find the contact and output what we WOULD save.

    const phoneNumber = call.customer?.number;
    if (!phoneNumber) {
        console.log("No phone number on call.");
        return;
    }

    const normalizedPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    const last4 = normalizedPhone.slice(-4);

    const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .ilike('phoneNumber', `%${last4}%`);

    const contact = contacts?.[0];

    if (!contact) {
        console.log("No matching local contact found for:", phoneNumber);
        return;
    }

    console.log(`Matched Contact: ${contact.firstName} ${contact.lastName}`);

    // Recover Appointment logic?
    // We look for logic in the messages or valid tool calls?
    // Vapi might store tool calls in `messages` or `toolCalls`
    // Let's print messages to see if we can find the appointment details.

    // Actually, let's just auto-save the call log first.
    const logData = {
        contact_id: contact.id,
        duration: call.duration || 0,
        outcome: call.endedReason || 'Completed',
        recording_url: call.recordingUrl || call.stereoRecordingUrl,
        transcript: call.transcript || call.analysis?.summary || 'Recovered Log',
        sentiment: call.analysis?.sentiment || 'Neutral',
        created_at: call.createdAt
    };

    console.log("Recovering Call Log:", logData);

    const { error: logError } = await supabase.from('call_logs').insert(logData);
    if (logError) console.error("Log Insert Error:", logError);
    else console.log("Call Log Saved!");

    // Check for appointment tool calls
    // Note: Vapi structure for tool calls might be in messages
}

main();
