
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Checking Appointments Table...");
    const { error } = await supabase.from('appointments').select('count', { count: 'exact', head: true });

    if (error) {
        console.log("Error accessing 'appointments' table:", error.message);
    } else {
        console.log("Success: 'appointments' table exists.");
    }
}

main();
