
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function generateReport() {
    console.log(`Connecting to: ${supabaseUrl?.substring(0, 20)}...`);
    // console.log(`Key length: ${supabaseKey?.length}`);

    // Test Contacts Data
    const { count: contactCount, error: contactError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

    console.log(`Debug: Found ${contactCount} contacts.`);

    const { count: callsCount, error: callsCountError } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact', head: true });

    console.log(`Debug: Found ${callsCount} call_logs rows.`);

    const { data: logs, error } = await supabase
        .from('call_logs')
        .select('*')
        .limit(1000);

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log("No call logs found.");
        return;
    }

    console.log("First Log Sample:", JSON.stringify(logs[0], null, 2));

    // Stats
    const logsWithDuration = logs.filter(l => l.duration > 0).length;
    const logsWithCost = logs.filter(l => l.cost > 0).length;
    console.log(`Debug stats: ${logsWithDuration} logs with duration > 0, ${logsWithCost} logs with cost > 0`);

    // Assumptions for Estimate
    // Vapi Base: $0.05/min
    // Telephony (Twilio): ~$0.015/min
    // LLM/Turbo: ~$0.08/min
    // TOTAL ESTIMATE: ~$0.15 - $0.20/min
    const EST_RATE_PER_MIN = 0.20;

    let totalCost = 0;
    let voicemailCost = 0;
    let connectedCost = 0;

    let totalDuration = 0;
    let voicemailDuration = 0;
    let connectedDuration = 0;

    let voicemailCount = 0;
    let connectedCount = 0;

    logs.forEach(log => {
        const durationSec = log.duration || 0;
        const durationMin = durationSec / 60;

        // Use actual cost if tracked (and > 0), otherwise estimate
        let callCost = log.cost > 0 ? log.cost : (durationMin * EST_RATE_PER_MIN);

        // Vapi has a minimum cost floor usually, but let's stick to simple math for now
        // or ensure at least 1 min billing? No, usually per second.

        totalCost += callCost;
        totalDuration += durationMin;

        // Categorize
        // Simulating "Voicemail" as "Attempted" or short duration completed?
        // Actually user distinguishes "Completed" vs "Attempted".
        // Often "Attempted" (0 duration) costs $0 in Vapi if it didn't connect.
        // But if it left a voicemail, it MUST have connected and have duration > 0.
        // So "Voicemail" calls usually have outcome="Completed" but short duration? 
        // OR the user might mean cases where the AI detected voicemail.

        // Let's use the 'outcome' field or duration logic.
        // If duration > 0, we incurred cost.
        if (durationSec > 0) {
            // Check transcript for "voicemail" mention or generic heuristic?
            // For now, let's assume 'Completed' with duration < 60s might be voicemail, 
            // OR checks generic buckets.

            // Actually, let's just split by "Connected" cost.

            // If the user feels "voicemails are costing a lot", they imply successful connections 
            // where the AI just left a message.
            connectedCount++;
            connectedCost += callCost;
            connectedDuration += durationMin;

            // Refined Voicemail Guess:
            // If transcript contains "voicemail" or "message"
            const transcript = (log.transcript || '').toLowerCase();
            if (transcript.includes('voicemail') || transcript.includes('record your message') || transcript.includes('not available')) {
                voicemailCount++;
                voicemailCost += callCost;
                voicemailDuration += durationMin;
                // Remove from generic connected bucket for clearer stats? 
                // Let's keep "Connected" as total, and "Voicemail" as a subset.
            }
        }
    });

    console.log(`\nTOTAL CALLS (Billed): ${connectedCount}`);
    console.log(`Total Estimated Cost: $${totalCost.toFixed(2)}`);
    console.log(`Total Billed Duration: ${totalDuration.toFixed(1)} minutes`);
    console.log(`Avg Cost per Call: $${(totalCost / (connectedCount || 1)).toFixed(2)}`);

    console.log(`\n--- 🕵️‍♂️ VOICEMAIL ANALYSIS (Approximate) ---`);
    console.log(`Calls detected as Voicemails: ${voicemailCount}`);
    console.log(`Cost of Voicemails: $${voicemailCost.toFixed(2)}`);
    console.log(`(% of Bill: ${((voicemailCost / totalCost) * 100).toFixed(0)}%)`);

    console.log(`\nNOTE: This uses an estimated rate of $${EST_RATE_PER_MIN}/min for past calls.`);
    console.log(`Future calls will track exact Vapi spend.`);
}

generateReport();
