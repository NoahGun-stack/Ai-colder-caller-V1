
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    // Hardcoded details from the transcript I just read
    const TARGET_PHONE_LAST_4 = '5868'; // From previous log output confirmation
    const APPT_TIME = '2026-01-03T17:00:00-06:00'; // "Next Saturday" (Jan 3) at 5 PM local
    // Note: Assuming "next Saturday" relative to Dec 27 is Jan 3rd.

    console.log("Recovering Appointment for Next Saturday (Jan 3) at 5 PM...");

    // 1. Find Contact
    const { data: contacts } = await supabase
        .from('contacts')
        .select('id, firstName, lastName')
        .ilike('phoneNumber', `%${TARGET_PHONE_LAST_4}%`);

    const contact = contacts?.[0];
    if (!contact) {
        console.error("Could not find contact.");
        return;
    }

    console.log(`Booking for: ${contact.firstName} ${contact.lastName}`);

    // 2. Insert Appointment
    const { error } = await supabase.from('appointments').insert({
        contact_id: contact.id,
        datetime: APPT_TIME,
        notes: "Recovered from Vapi Transcript: User requested 5 PM on Saturday."
    });

    if (error) console.error("Error:", error);
    else console.log("Success: Appointment Recovered!");
}

main();
