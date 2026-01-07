
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    console.log('Checking last 5 contacts...');
    const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Found contacts:', contacts.length);
    contacts.forEach(c => {
        console.log(`- Name: ${c.firstName} ${c.lastName}, Phone: "${c.phoneNumber}", ID: ${c.id}`);
    });
}

check();
