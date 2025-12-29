
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("--- Fixing Appointment Assignment ---");

    // 1. Delete the incorrect appointment for Bill
    // We'll look for the one created recently with the specific note
    const { data: wrongAppt } = await supabase
        .from('appointments')
        .select('id')
        .ilike('notes', '%Recovered from Vapi Transcript%')
        .single();

    if (wrongAppt) {
        await supabase.from('appointments').delete().eq('id', wrongAppt.id);
        console.log("Deleted incorrect appointment for Bill.");
    }

    // 2. Find Kody
    const { data: contacts } = await supabase
        .from('contacts')
        .select('id, firstName, lastName')
        .ilike('phoneNumber', '%0530%'); // Correct digits for Kody

    const kody = contacts?.[0];
    if (!kody) {
        console.error("Could not find Kody.");
        return;
    }

    console.log(`Re-booking for: ${kody.firstName} ${kody.lastName}`);

    // 3. Insert Correct Appointment
    const { error } = await supabase.from('appointments').insert({
        contact_id: kody.id,
        datetime: '2026-01-03T17:00:00-06:00', // Next Saturday 5 PM
        notes: "Recovered from Vapi Transcript: User requested 5 PM on Saturday. (Fixed)"
    });

    if (error) console.error("Error:", error);
    else console.log("Success: Appointment Moved to Kody!");
}

main();
