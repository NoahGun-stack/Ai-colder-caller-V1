
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Bypass RLS

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("--- Recovering Appointment for 'Kyle' ---");

    // 1. Get the most recent call log (which we just saved)
    const { data: logs } = await supabase
        .from('call_logs')
        .select('contact_id, created_at, contacts(firstName, lastName)')
        .order('created_at', { ascending: false })
        .limit(1);

    const log = logs?.[0];
    if (!log) {
        console.error("No call log found!");
        return;
    }

    const contact = log.contacts;
    // @ts-ignore
    console.log(`Found Log for: ${contact?.firstName} ${contact?.lastName}`);

    // 2. Insert Appointment
    // Target: Thursday, Jan 1st, 2026 at 4:00 PM (-06:00)
    const APPT_TIME = '2026-01-01T16:00:00-06:00';

    const { error } = await supabase.from('appointments').insert({
        contact_id: log.contact_id,
        datetime: APPT_TIME,
        notes: "Recovered from Vapi Transcript: User requested Thursday at 4 PM."
    });

    if (error) console.error("Error:", error);
    else console.log(`Success: Appointment Booked for ${APPT_TIME}!`);
}

main();
