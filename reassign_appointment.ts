
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function reassignAppointment() {
    console.log("--- Reassigning Appointment to Young Seo ---");

    // 1. Get Young Seo's ID
    const { data: youngs } = await supabase
        .from('contacts')
        .select('id, address, city, state, zip')
        .ilike('firstName', 'Young')
        .ilike('lastName', 'Seo')
        .limit(1);

    if (!youngs || youngs.length === 0) {
        console.error("Young Seo not found!");
        return;
    }
    const young = youngs[0];
    console.log("Found Young Seo:", young.id);

    // 2. Get the appointment currently assigned to Nicole
    const { data: appts } = await supabase
        .from('appointments')
        .select('id')
        .ilike('notes', '%Manually recovered%')
        .limit(1);

    if (!appts || appts.length === 0) {
        console.error("Target appointment not found!");
        return;
    }
    const appt = appts[0];
    console.log("Found Appointment:", appt.id);

    // 3. Update the appointment
    const newNotes = `Manually recovered from Vapi transcript. Address: ${young.address || '1707 CLIFFSIDE DR'}`;

    const { error } = await supabase
        .from('appointments')
        .update({
            contact_id: young.id,
            notes: newNotes
        })
        .eq('id', appt.id);

    if (error) {
        console.error("Failed to update appointment:", error);
    } else {
        console.log("SUCCESS: Reassigned appointment to Young Seo.");
    }
}

reassignAppointment();
