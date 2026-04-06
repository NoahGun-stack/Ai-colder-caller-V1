
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("Searching for 'Noah re'...");

    // 1. Find the Contact
    const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*')
        .ilike('phoneNumber', '%6174602245%');

    if (error) {
        console.error(error);
        return;
    }

    if (!contacts.length) {
        console.log("No contact found matching 'Noah re'.");
        return;
    }

    console.log(`Found ${contacts.length} contacts:`);
    for (const c of contacts) {
        console.log(`[Contact] ID: ${c.id}`);
        console.log(`  Name: ${c.firstName} ${c.lastName}`);
        console.log(`  Phone: ${c.phoneNumber}`);
        console.log(`  Status: ${c.status}`);
        console.log(`  Total Calls (DB): ${c.total_calls}`);
        console.log(`  Last Contacted: ${c.last_contacted_at}`);

        // 2. Count Direct Logs
        const { count: logCount } = await supabase
            .from('call_logs')
            .select('*', { count: 'exact', head: true })
            .eq('contact_id', c.id);

        console.log(`  -> Actual Logs in DB (by ID): ${logCount}`);

        // 3. Check for Orphaned Logs (by phone)?
        // Need to see call_logs schema first. Assuming no phone column yet.
    }
}

diagnose();
