
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBookedStatus() {
    console.log("Starting Status Backfill...");

    // 1. Get all unique contact IDs from appointments
    const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('contact_id');

    if (aptError) {
        console.error("Error fetching appointments:", aptError);
        return;
    }

    if (!appointments || appointments.length === 0) {
        console.log("No appointments found.");
        return;
    }

    // Get unique IDs
    const contactIds = [...new Set(appointments.map(a => a.contact_id))];
    console.log(`Found ${contactIds.length} contacts with appointments.`);

    // 2. Update these contacts
    let successCount = 0;

    for (const id of contactIds) {
        if (!id) continue;

        const { error } = await supabase
            .from('contacts')
            .update({ status: 'Appointment Booked' })
            .eq('id', id);

        if (error) {
            console.error(`Failed to update contact ${id}:`, error.message);
        } else {
            successCount++;
        }
    }

    console.log(`Successfully updated ${successCount} contacts to 'Appointment Booked'.`);
}

fixBookedStatus();
