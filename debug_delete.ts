
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDelete() {
    console.log("Debugging Appointment Deletion...");

    // 1. Create a dummy contact first (needed for constraint)
    const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
            firstName: 'Debug',
            lastName: 'Delete',
            phoneNumber: '+19999999999',
            address: '123 Debug St',
            city: 'Debug City',
            state: 'TX',
            zip: '00000',
            status: 'New'
        })
        .select()
        .single();

    if (contactError) {
        console.error("Error creating test contact:", contactError);
        return;
    }
    console.log("Created test contact:", contact.id);

    // 2. Create a dummy appointment
    const { data: appointment, error: createError } = await supabase
        .from('appointments')
        .insert({
            contact_id: contact.id,
            datetime: new Date().toISOString(),
            notes: 'Test deletion',
            status: 'scheduled'
        })
        .select()
        .single();

    if (createError) {
        console.error("Error creating test appointment:", createError);
        return;
    }
    console.log("Created test appointment:", appointment.id);

    // 3. Try to delete it
    const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment.id);

    if (deleteError) {
        console.error("❌ Error deleting appointment:", deleteError);
    } else {
        console.log("✅ Successfully deleted appointment!");
    }

    // Cleanup contact
    await supabase.from('contacts').delete().eq('id', contact.id);
}

debugDelete();
