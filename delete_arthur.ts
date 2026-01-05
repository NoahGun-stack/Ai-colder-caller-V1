
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteArthur() {
    console.log('Searching for Arthur Fowler to delete...');

    // 1. Find Arthur
    const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('firstName', 'Arthur')
        .eq('lastName', 'Fowler')
        .single();

    if (error || !contacts) {
        console.error('Arthur not found or error:', error);
        return;
    }

    const contactId = contacts.id;
    console.log(`Found Arthur (ID: ${contactId}). Deleting...`);

    // 2. Delete Appointments
    const { error: aptError } = await supabase
        .from('appointments')
        .delete()
        .eq('contact_id', contactId);

    if (aptError) console.error('Error deleting appointments:', aptError);
    else console.log('Appointments deleted.');

    // 3. Delete Call Logs
    const { error: logError } = await supabase
        .from('call_logs')
        .delete()
        .eq('contact_id', contactId);

    if (logError) console.error('Error deleting call logs:', logError);
    else console.log('Call logs deleted.');

    // 4. Delete Contact
    const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

    if (deleteError) console.error('Error deleting contact:', deleteError);
    else console.log('Arthur Fowler contact deleted successfully.');
}

deleteArthur();
