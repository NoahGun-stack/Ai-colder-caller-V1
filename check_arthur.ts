
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkArthur() {
    console.log('Searching for Arthur...');
    const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*')
        .ilike('firstName', '%Arthur%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Found contacts:', contacts);

    if (contacts && contacts.length > 0) {
        // Just check the first one, or the one with "Fowler" specifically
        const arthurFowler = contacts.find(c => c.lastName === 'Fowler') || contacts[0];
        const contactId = arthurFowler.id;

        const { data: apts, error: aptError } = await supabase
            .from('appointments')
            .select('*')
            .eq('contact_id', contactId);

        if (aptError) {
            console.error('Error fetching appointments:', aptError);
        } else {
            console.log('Appointments for Arthur:', apts);
        }

        const { data: logs, error: logError } = await supabase
            .from('call_logs')
            .select('*')
            .eq('contact_id', contactId);

        if (logError) {
            console.error('Error fetching call logs:', logError);
        } else {
            console.log('Call Logs for Arthur:', logs);
        }
    }
}

checkArthur();
