
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('--- Checking Appointments ---');
    const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (aptError) console.error('Error fetching appointments:', aptError);
    else {
        console.log(`Found ${appointments.length} recent appointments:`);
        appointments.forEach(apt => {
            console.log(`- [${apt.datetime}] Status: ${apt.status} | Contact ID: ${apt.contact_id}`);
            console.log(`  Notes: ${apt.notes}`);
        });
    }

    console.log('\n--- Checking Call Logs ---');
    // Check call_logs if table exists
    const { data: logs, error: logError } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (logError) {
        if (logError.code === '42P01') console.log('Call logs table does not exist yet (Run the SQL!).');
        else console.error('Error fetching call logs:', logError);
    } else {
        console.log(`Found ${logs.length} recent call logs:`);
        logs.forEach(log => {
            console.log(`- [${log.created_at}] Outcome: ${log.outcome} | Duration: ${log.duration}s`);
            console.log(`  Recording: ${log.recording_url}`);
        });
    }
}

checkData();
