
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixNicoleAppointment() {
    console.log("--- Fixing Nicole's Appointment Time ---");

    // 1. Find the appointment for Nicole Schilling
    // We can find by contact name join or just by the note I added
    const { data: appts, error } = await supabase
        .from('appointments')
        .select(`
            id,
            datetime,
            contact:contacts!inner(firstName, lastName)
        `)
        .ilike('contact.firstName', 'Nicole')
        .ilike('contact.lastName', 'Schilling')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !appts || appts.length === 0) {
        console.error("Could not find appointment for Nicole Schilling", error);
        return;
    }

    const appt = appts[0];
    console.log(`Found Appointment: ${appt.id}`);
    console.log(`Current Time (UTC/ISO): ${appt.datetime}`);

    // 2. Update to 9 AM CST
    // CST is UTC-6
    // 09:00 CST = 15:00 UTC
    // Format: 2026-01-07T09:00:00-06:00
    const correctTime = '2026-01-07T09:00:00-06:00';

    const { data: updated, error: updateError } = await supabase
        .from('appointments')
        .update({ datetime: correctTime })
        .eq('id', appt.id)
        .select();

    if (updateError) {
        console.error("Failed to update:", updateError);
    } else {
        console.log("SUCCESS: Updated appointment time.");
        console.log(updated);
    }
}

fixNicoleAppointment();
