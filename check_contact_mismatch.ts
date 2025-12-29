
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("--- Investigation: Who is 5868? ---");

    // 1. Search by Phone Number (Last 4 digits from the call)
    const { data: byPhone } = await supabase
        .from('contacts')
        .select('*')
        .ilike('phoneNumber', '%5868%');

    console.log("Contacts passing phone check (5868):");
    console.table(byPhone?.map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        phone: c.phoneNumber
    })));

    // 2. Search by Name (Kody / Cody)
    const { data: byName } = await supabase
        .from('contacts')
        .select('*')
        .or('firstName.ilike.%Kody%,firstName.ilike.%Cody%');

    console.log("\nContacts named Kody or Cody:");
    console.table(byName?.map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        phone: c.phoneNumber
    })));
}

main();
