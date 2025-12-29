
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("--- Checking Stats for 'Jon' ---");

    // 1. Find Jon
    const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .ilike('firstName', 'Jon%');

    if (!contacts || contacts.length === 0) {
        console.log("Jon not found.");
        return;
    }

    const jon = contacts[0];
    console.log("Contact Record:");
    console.table({
        id: jon.id,
        name: `${jon.firstName} ${jon.lastName}`,
        total_calls: jon.total_calls,
        last_contacted_at: jon.last_contacted_at,
        last_outcome: jon.last_outcome
    });

    // 2. Check Call Logs for Jon
    const { data: logs } = await supabase
        .from('call_logs')
        .select('*')
        .eq('contact_id', jon.id);

    console.log(`\nFound ${logs?.length} Call Logs for Jon.`);
    if (logs && logs.length > 0) {
        console.log("Most recent log:", logs[0].created_at);
    }
}

main();
