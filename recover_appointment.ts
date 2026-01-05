
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function recoverAppointment() {
    console.log("--- Recovering Missing Appointment ---");

    // 1. Find Contact "Nicole Schilling"
    const { data: contacts, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .ilike('firstName', 'Nicole%')
        .ilike('lastName', 'Schilling%')
        .limit(1);

    if (contactError || !contacts || contacts.length === 0) {
        console.error("Contact 'Nicole Schilling' not found!");
        return;
    }

    const contact = contacts[0];
    console.log(`Found Contact: ${contact.firstName} ${contact.lastName} (${contact.id})`);

    // 2. Insert Appointment
    // Date: Wednesday, Jan 7th 2026, 9:00 AM
    // ISO: 2026-01-07T09:00:00
    const appointmentTime = '2026-01-07T09:00:00-05:00'; // EST

    const { data, error } = await supabase
        .from('appointments')
        .insert({
            contact_id: contact.id,
            datetime: appointmentTime,
            status: 'scheduled',
            notes: 'Manually recovered from Vapi transcript. Address: 1707 Cliffside Dr.'
        })
        .select();

    if (error) {
        console.error("Failed to insert appointment:", error);
    } else {
        console.log("SUCCESS: Appointment recovered!");
        console.log(data);
    }
}

recoverAppointment();
