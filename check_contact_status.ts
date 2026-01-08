
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    console.log('Checking status for Noah Gunawan...');
    const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, firstName, lastName, phoneNumber, status')
        .ilike('firstName', 'Noah%')
        .ilike('lastName', 'Gunawan%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Found contacts:', contacts.length);
    contacts.forEach(c => {
        console.log(`- ${c.firstName} ${c.lastName}: Status = "${c.status}"`);
    });
}

check();
