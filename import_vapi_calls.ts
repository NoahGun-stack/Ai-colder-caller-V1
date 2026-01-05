
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const {
    VITE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    VITE_VAPI_PRIVATE_KEY
} = process.env;

if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VITE_VAPI_PRIVATE_KEY) {
    console.error('Missing env vars. Ensure SUPABASE_SERVICE_ROLE_KEY and VITE_VAPI_PRIVATE_KEY are set.');
    process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const VAPI_BASE_URL = 'https://api.vapi.ai';

async function importCalls() {
    console.log('Fetching calls from Vapi...');

    try {
        const response = await fetch(`${VAPI_BASE_URL}/call`, {
            headers: {
                'Authorization': `Bearer ${VITE_VAPI_PRIVATE_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Vapi API Error: ${response.statusText}`);
        }

        const calls = await response.json();
        console.log(`Found ${calls.length} calls in Vapi history.`);

        let newCount = 0;
        let skipCount = 0;

        for (const call of calls) {
            const phoneNumber = call.customer?.number;
            if (!phoneNumber) continue;

            // only process 'ended' calls with recordings
            const recordingUrl = call.recordingUrl || call.stereoRecordingUrl;
            if (!recordingUrl) continue;

            // Check if already exists (avoid dupes check removed, now we verify to get ID for upsert)
            const { data: existing } = await supabase
                .from('call_logs')
                .select('id')
                .eq('recording_url', recordingUrl)
                .single();

            if (existing) {
                // If it exists, we still want to update it if cost/duration is missing
                console.log(`Updating existing log for ${phoneNumber}`);
            }

            // Calculate duration if missing
            let finalDuration = call.duration || 0;
            if (!finalDuration && call.createdAt && call.updatedAt) {
                const start = new Date(call.createdAt).getTime();
                const end = new Date(call.updatedAt).getTime();
                finalDuration = Math.round((end - start) / 1000);
            }

            // Find Contact
            const normalizedPhone = phoneNumber.replace(/\D/g, '').slice(-10);
            const last4 = normalizedPhone.slice(-4);

            const { data: contacts } = await supabase
                .from('contacts')
                .select('id')
                .ilike('phoneNumber', `%${last4}%`);

            const contact = contacts?.[0]; // Rough match logic same as webhook

            if (contact) {
                // Upsert logic
                // If existing, use its ID.
                const payload: any = {
                    contact_id: contact.id,
                    duration: finalDuration,
                    outcome: call.endedReason || 'Completed',
                    recording_url: recordingUrl,
                    transcript: call.transcript || call.summary || 'Imported from Vapi History',
                    sentiment: call.analysis?.sentiment || 'Neutral',
                    created_at: call.createdAt || new Date().toISOString()
                };

                if (existing) {
                    payload.id = existing.id;
                }

                const { error } = await supabase.from('call_logs').upsert(payload);

                if (error) {
                    console.error('Failed to upsert log:', error.message);
                } else {
                    console.log(`Upserted call for ${phoneNumber} (Duration: ${finalDuration}s, Cost: ${payload.cost})`);
                    newCount++;
                }
            } else {
                console.log(`Skipping call for ${phoneNumber} - No matching contact found.`);
            }
        }

        console.log('--- Import Summary ---');
        console.log(`Total Vapi Calls: ${calls.length}`);
        console.log(`Processed/Upserted: ${newCount}`);

    } catch (e: any) {
        console.error('Import Failed:', e);
    }
}

importCalls();
