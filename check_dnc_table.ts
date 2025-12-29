
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    try {
        const { error } = await supabase.from('dnc_list').select('count', { count: 'exact', head: true });
        if (error) {
            console.log('Error:', error.message);
        } else {
            console.log('Success: Table exists.');
        }
    } catch (e) {
        console.log('Error:', e);
    }
}

check();
