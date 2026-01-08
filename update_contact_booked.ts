
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function update() {
    console.log('Updating Noah Gunawan to Appointment Booked...');

    // Find the contact first to get ID
    const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .ilike('firstName', 'Noah%')
        .ilike('lastName', 'Gunawan%');

    if (!contacts || contacts.length === 0) {
        console.error('Contact not found');
        return;
    }

    const { error } = await supabase
        .from('contacts')
        .update({ status: 'Appointment Booked' })
        .eq('id', contacts[0].id);

    if (error) {
        console.error('Update Error:', error);
    } else {
        console.log('✅ Successfully updated contact status.');
    }
}

update();
