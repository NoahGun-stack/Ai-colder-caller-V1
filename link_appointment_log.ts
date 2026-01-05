
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function linkAppointment() {
    console.log("--- Linking Appointment to Call Log ---");

    // 1. Find Nicole's Appointment
    const { data: appts } = await supabase
        .from('appointments')
        .select('id, contact_id')
        .ilike('notes', '%Manually recovered%')
        .limit(1);

    if (!appts || appts.length === 0) {
        console.error("Could not find the manually recovered appointment.");
        return;
    }
    const appt = appts[0];
    console.log(`Found Appointment: ${appt.id}`);

    // 2. Find the Call Log
    const { data: logs } = await supabase
        .from('call_logs')
        .select('id, created_at, recording_url')
        .eq('contact_id', appt.contact_id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (!logs || logs.length === 0) {
        console.error("No call logs found for this contact.");
        return;
    }

    const log = logs[0];
    console.log(`Found Call Log: ${log.id} (${log.created_at})`);

    // 3. Update Appointment created_at to match Log
    // This makes the UI think the appointment was created "during" this call.
    const { error } = await supabase
        .from('appointments')
        .update({ created_at: log.created_at })
        .eq('id', appt.id);

    if (error) {
        console.error("Failed to update timestamp:", error);
    } else {
        console.log("SUCCESS: Synced appointment timestamp to call log.");
    }
}

linkAppointment();
