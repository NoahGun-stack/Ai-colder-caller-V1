
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkPolicies() {
    console.log('Checking policies...');
    // We can't query pg_policies easily via client unless we have a specific RPC or direct connection.
    // Instead, let's try to delete a log and see the error.

    // 1. Create a dummy log if needed, or find one.
    const { data: logs } = await supabase.from('call_logs').select('id').limit(1);
    if (!logs || logs.length === 0) {
        console.log('No logs to test deletion on.');
        return;
    }

    const logId = logs[0].id;
    console.log(`Attempting to delete log: ${logId} with SERVICE ROLE key (should work)`);

    // Test with SERVICE ROLE (should always work)
    const { error: serviceError } = await supabase.from('call_logs').delete().eq('id', logId);
    if (serviceError) {
        console.error('Service Role delete failed:', serviceError);
    } else {
        console.log('Service Role delete succeeded.');
    }

    // Now testing as a logged in user is harder from a script without credentials. 
    // But if Service Role works, then the issue is indeed RLS for the anon/authenticated key used in the app.
}

checkPolicies();
