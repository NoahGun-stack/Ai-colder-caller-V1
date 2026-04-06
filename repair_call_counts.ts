
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Prefer Service Role for admin updates, fall back to Anon
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL: Missing Supabase Credentials in .env.local');
    // console.log("Debug Env:", process.env); // Don't print secrets in prod
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function repairCounts() {
    console.log(`Starting Repair Script...`);
    console.log(`Target: ${supabaseUrl}`);
    console.log(`Key Mode: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE (Admin)' : 'ANON (Public)'}`);

    // 1. Fetch ALL Call Logs
    const { data: logs, error: logError } = await supabase
        .from('call_logs')
        .select('contact_id');

    if (logError) {
        console.error('Error fetching logs:', logError);
        return;
    }

    console.log(`Found ${logs.length} total call logs.`);

    // 2. Aggregate Counts
    const counts: Record<string, number> = {};
    logs.forEach(log => {
        if (log.contact_id) {
            counts[log.contact_id] = (counts[log.contact_id] || 0) + 1;
        }
    });

    console.log(`identified ${Object.keys(counts).length} unique contacts with calls.`);

    // 3. Update Contacts
    let updated = 0;
    let errors = 0;

    for (const [contactId, count] of Object.entries(counts)) {
        // console.log(`Updating Contact ${contactId} -> ${count} calls...`);

        const { error } = await supabase
            .from('contacts')
            .update({
                total_calls: count,
                // Optional: If call count > 0 and status is 'Uncontacted', bump to 'Attempted'
                // But let's be safe and only update counts for now unless asked.
            })
            .eq('id', contactId);

        if (error) {
            console.error(`Failed to update ${contactId}:`, error.message);
            errors++;
        } else {
            updated++;
        }
    }

    // 4. Zero out others? 
    // Technically we should set total_calls = 0 for anyone NOT in the logs?
    // User only complained about "Uncontacted" filter logic which relies on > 0.
    // If it's NULL, it's treated as 0 usually. I won't bulk update the rest to avoid massive writes.

    console.log(`\n--- REPAIR COMPLETE ---`);
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${errors}`);
}

repairCounts();
