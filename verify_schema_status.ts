
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("--- Schema Verification ---");

    // 1. Check CRM Columns (total_calls)
    // We select 1 record and try to ask for 'total_calls'. 
    // If column sucks, it will error.
    const { error: colError } = await supabase.from('contacts').select('total_calls').limit(1);
    if (colError) {
        console.log("[MISSING] CRM Columns (total_calls):", colError.message);
    } else {
        console.log("[OK] CRM Columns");
    }

    // 2. Check Scrub Function
    // We call it. It might return void (null data) or error.
    const { error: rpcError } = await supabase.rpc('scrub_dnc_contacts');
    if (rpcError) {
        console.log("[MISSING] Scrub Function:", rpcError.message);
    } else {
        console.log("[OK] Scrub Function");
    }
}

main();
