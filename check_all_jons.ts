
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("--- Listing All 'Jons' ---");

    const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .ilike('firstName', 'Jon%');

    if (!contacts) {
        console.log("No Jons found.");
        return;
    }

    console.table(contacts.map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        phone: c.phoneNumber,
        total_calls: c.total_calls
    })));
}

main();
