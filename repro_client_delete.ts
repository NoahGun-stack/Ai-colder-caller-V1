
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use ANON key to simulate client
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function testClientDelete() {
    console.log('Testing Client (Anon) Deletion...');

    // 1. Create a dummy log (need service role to create it reliably first, or assume one exists)
    // To be self-contained, let's use service role to create a dummy log, then try to delete it as anon.
    const adminSupabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: newLog, error: createError } = await adminSupabase
        .from('call_logs')
        .insert([{ outcome: 'TEST_LOG_DELETE_ME', duration: 0 }])
        .select()
        .single();

    if (createError) {
        console.error('Setup failed: Could not create test log.', createError);
        return;
    }

    console.log(`Created test log: ${newLog.id}. Attempting delete as Client...`);

    // 2. Try delete as Client
    const { error: deleteError } = await supabase
        .from('call_logs')
        .delete()
        .eq('id', newLog.id);

    if (deleteError) {
        console.error('❌ Client delete failed (Expected if RLS broken):', deleteError);
    } else {
        // Double check it's gone
        const { data: check } = await adminSupabase.from('call_logs').select('id').eq('id', newLog.id);
        if (check && check.length === 0) {
            console.log('✅ Client delete succeeded!');
        } else {
            console.log('❌ Client delete returned no error, but row still exists (Silent RLS failure).');
        }
    }

    // Cleanup if needed
    if (!deleteError) {
        await adminSupabase.from('call_logs').delete().eq('id', newLog.id);
    }
}

testClientDelete();
