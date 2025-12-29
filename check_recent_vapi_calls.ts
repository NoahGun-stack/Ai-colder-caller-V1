
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const VAPI_BASE_URL = 'https://api.vapi.ai';
const VAPI_KEY = process.env.VITE_VAPI_PRIVATE_KEY;

async function main() {
    console.log("--- Fetching Last 5 Vapi Calls ---");
    const response = await fetch(`${VAPI_BASE_URL}/call?limit=5`, {
        headers: {
            'Authorization': `Bearer ${VAPI_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const calls = await response.json();
    console.log(`Found ${calls.length} calls.`);

    calls.forEach((c: any, i: number) => {
        console.log(`\n[${i + 1}] ID: ${c.id}`);
        console.log(`    Time: ${c.createdAt}`);
        console.log(`    Phone: ${c.customer?.number}`);
        console.log(`    Status: ${c.status}`);
        console.log(`    Ended Reason: ${c.endedReason}`);
    });
}

main();
