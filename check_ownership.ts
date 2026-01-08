
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use SERVICE ROLE to see everything
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkOwnership() {
    console.log('--- Checking Ownership ---');

    // 1. Get a sample of contacts linked to call logs
    const { data: logs } = await supabase.from('call_logs').select('contact_id').limit(5);
    const contactIds = logs?.map(l => l.contact_id).filter(Boolean) || [];

    if (contactIds.length === 0) {
        console.log('No logs found.');
        return;
    }

    const { data: contacts } = await supabase
        .from('contacts')
        .select('id, firstName, user_id')
        .in('id', contactIds);

    console.log('Sample Contacts linked to logs:');
    contacts?.forEach(c => {
        console.log(`- ${c.firstName} (${c.id}) -> Owner: ${c.user_id}`);
    });

    // 2. Get the specific user ID we are likely testing with (Noah)
    // We can't easily guess the user ID without login, but we can list distinct user_ids in contacts
    const { data: allContacts } = await supabase.from('contacts').select('user_id');
    const userCounts = {};
    allContacts?.forEach(c => {
        const uid = c.user_id || 'NULL';
        userCounts[uid] = (userCounts[uid] || 0) + 1;
    });
    console.log('\nContact Ownership Distribution:', userCounts);
}

checkOwnership();
