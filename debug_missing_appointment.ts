
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const VAPI_PRIVATE_KEY = process.env.VITE_VAPI_PRIVATE_KEY;

async function debugAppointment() {
    console.log("--- Debugging Missing Appointment ---");

    // 1. Find Contact
    const { data: contacts, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .ilike('firstName', 'Nicole%')
        .ilike('lastName', 'Schilling%');

    if (contactError || !contacts || contacts.length === 0) {
        console.error("Contact 'Nicole Schilling' not found!", contactError);
        return;
    }

    const contact = contacts[0];
    console.log(`Found Contact: ${contact.firstName} ${contact.lastName}`);

    // 2. Find recent calls in DB
    const { data: dbLogs } = await supabase
        .from('call_logs')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (!dbLogs || dbLogs.length === 0) {
        console.log("No DB logs found.");
        return;
    }

    const dbLog = dbLogs[0];
    const recordingUrl = dbLog.recording_url;
    console.log(`\nAnalyzing Recording URL: ${recordingUrl}`);

    // Extract potential UUIDs
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const matches = recordingUrl ? recordingUrl.match(uuidRegex) : null;

    if (!matches) {
        console.error("No UUIDs found in recording URL to use as Call ID.");
        return;
    }

    console.log(`Found potential Call IDs:`, matches);

    for (const id of matches) {
        console.log(`\nCheck Vapi Call ID: ${id}...`);
        const callRes = await fetch(`https://api.vapi.ai/call/${id}`, {
            headers: { 'Authorization': `Bearer ${VAPI_PRIVATE_KEY}` }
        });

        if (callRes.ok) {
            const call = await callRes.json();
            console.log("\n>>> SUCCESS: Found Call Details! <<<");
            console.log(`ID: ${call.id}`);
            console.log(`Status: ${call.status}`);
            console.log(`Ended Reason: ${call.endedReason}`);

            if (call.toolCalls && call.toolCalls.length > 0) {
                console.log("\n--- Tool Calls Executed ---");
                call.toolCalls.forEach((tc: any) => {
                    console.log(`- Type: ${tc.type}, Function: ${tc.function?.name}`);
                    console.log(`  Args: ${tc.function?.arguments}`);
                    console.log(`  Result or Error:`, JSON.stringify(tc.result || tc.error, null, 2));
                });
            } else {
                console.log("\n--- NO Tool Calls Detected ---");
                console.log("The AI ended the call without attempting to book the appointment.");
            }
            return;
        } else {
            console.log(`Failed to fetch call ${id}: ${callRes.status}`);
        }
    }
    console.log("Could not find call using extracted IDs.");
}

debugAppointment();
