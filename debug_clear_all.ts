
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function debugClearAll() {
    console.log('--- Debugging Clear All Logic (As Client) ---');

    // 1. Fetch all visible contacts (Simulation of Step 1 in deleteAllCallLogs)
    const { data: contacts, error: contactError } = await supabase
        .from('contacts')
        .select('id, firstName, lastName');

    if (contactError) {
        console.error('Error fetching contacts:', contactError);
        return;
    }

    console.log(`Visible Contacts: ${contacts.length}`);
    const contactIds = new Set(contacts.map(c => c.id));

    // 2. Fetch all visible call logs
    const { data: logs, error: logError } = await supabase
        .from('call_logs')
        .select('id, contact_id');

    if (logError) {
        console.error('Error fetching logs:', logError);
        return;
    }

    console.log(`Visible Call Logs: ${logs.length}`);

    // 3. Check for mismatches
    const logsWithMissingContact = logs.filter(l => !l.contact_id);
    const logsWithInvisibleContact = logs.filter(l => l.contact_id && !contactIds.has(l.contact_id));

    console.log(`Logs with NULL contact_id: ${logsWithMissingContact.length}`);
    console.log(`Logs with contact_id NOT in visible contacts: ${logsWithInvisibleContact.length}`);

    if (logsWithInvisibleContact.length > 0) {
        console.warn('WARNING: These logs are visible to the user, but their parent contact is NOT. "Clear All" will miss them.');
    }
}

debugClearAll();
