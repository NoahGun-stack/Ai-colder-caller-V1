
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContact() {
    console.log("--- Checking Contact Data ---");

    const targetPhone = '5122998550';
    console.log(`Searching for phone: ${targetPhone}`);

    // 1. Search by Phone
    const { data: byPhone } = await supabase
        .from('contacts')
        .select('*')
        .ilike('phoneNumber', `%${targetPhone}%`);

    console.log("Found by Phone:", byPhone);

    // 2. Search by Name "Young Seo"
    const { data: byName } = await supabase
        .from('contacts')
        .select('*')
        .ilike('firstName', 'Young')
        .ilike('lastName', 'Seo');

    console.log("Found by Name 'Young Seo':", byName);

    // 3. Check the appointment
    const { data: appt } = await supabase
        .from('appointments')
        .select('*, contact:contacts(*)')
        .ilike('notes', '%Manually recovered%')
        .limit(1);

    console.log("Current Manually Recovered Appointment:", appt);
}

checkContact();
