
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testMatch(mockVapiPhone: string) {
    console.log(`\n--- Testing match for incoming phone: "${mockVapiPhone}" ---`);

    // Simulate server logic
    const normalizedPhone = mockVapiPhone.replace(/\D/g, '').slice(-10);
    console.log(`Normalized (Sever Logic): ${normalizedPhone}`);

    const last4 = normalizedPhone.slice(-4);
    console.log(`Searching for last4: ${last4}`);

    const { data: candidates, error: findError } = await supabase
        .from('contacts')
        .select('id, phoneNumber, firstName, lastName')
        .ilike('phoneNumber', `%${last4}%`);

    if (findError) {
        console.error('Find Error:', findError);
        return;
    }

    console.log(`Candidates found: ${candidates?.length}`);

    const contact = candidates?.find(c => {
        const dbPhone = (c.phoneNumber || '').replace(/\D/g, '').slice(-10);
        console.log(`  Comparing DB "${c.phoneNumber}" -> Normalized "${dbPhone}" vs Target "${normalizedPhone}"`);
        return dbPhone === normalizedPhone;
    });

    if (contact) {
        console.log('✅ MATCH FOUND:', contact.id, contact.firstName);
    } else {
        console.log('❌ NO MATCH FOUND');
    }
}

async function run() {
    await testMatch('+16174602245'); // Vapi often sends E.164
    await testMatch('16174602245');  // Maybe this format
    await testMatch('6174602245');   // Plain 10 digit
}

run();
