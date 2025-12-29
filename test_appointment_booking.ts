
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use service role if available for backend simulation, else anon
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(process.env.VITE_SUPABASE_URL!, supabaseKey);

async function main() {
    console.log("--- Simulating Appointment Booking ---");

    // 1. Get a Contact
    // We'll just grab the first one
    const { data: contacts, error: cError } = await supabase.from('contacts').select('*').limit(1);

    if (cError || !contacts || contacts.length === 0) {
        console.error("No contacts found to test with. Please add a contact first.");
        return;
    }

    const contact = contacts[0];
    console.log(`Testing with Contact: ${contact.firstName} ${contact.lastName} (${contact.phoneNumber})`);

    // 2. Simulate Tool Arguments
    const args = {
        datetime: new Date().toISOString(), // Now
        notes: "Test appointment from verification script"
    };

    console.log("Booking for:", args.datetime);

    // 3. Attempt Insert (Logic from server/index.ts)
    const { error: insertError, data: appt } = await supabase.from('appointments').insert({
        contact_id: contact.id,
        datetime: args.datetime,
        notes: args.notes
    }).select();

    if (insertError) {
        console.error("FAIL: Supabase Insert Error:", insertError.message);
        console.error("Details:", insertError);
    } else {
        console.log("SUCCESS: Appointment Booked!", appt);
    }
}

main();
