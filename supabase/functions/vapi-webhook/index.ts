
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json();
        console.log("Vapi Webhook Triggered:", JSON.stringify(body));

        const { message } = body;

        // Handle Tool Calls (Booking)
        if (message && message.type === 'tool-calls') {
            const toolCall = message.toolCalls[0];
            if (toolCall.function.name === 'book_appointment') {
                let args = toolCall.function.arguments;
                if (typeof args === 'string') {
                    try { args = JSON.parse(args); } catch (e) { console.error(e); }
                }

                const call = message.call;
                const rawPhoneNumber = call.customer.number;
                const normalizedPhone = rawPhoneNumber.replace(/\D/g, '').slice(-10);
                console.log(`Booking for ${normalizedPhone}`, args);

                const last4 = normalizedPhone.slice(-4);

                // 1. Find Contact
                const { data: contacts, error: findError } = await supabase
                    .from('contacts')
                    .select('id, phoneNumber, address, city, state, zip')
                    .ilike('phoneNumber', `%${last4}%`);

                if (findError) throw findError;

                const contact = contacts?.find((c: any) => {
                    return (c.phoneNumber || '').replace(/\D/g, '').slice(-10) === normalizedPhone;
                });

                if (!contact) {
                    return new Response(JSON.stringify({
                        results: [{
                            toolCallId: toolCall.id,
                            result: "Error: Contact not found in database."
                        }]
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                // 2. Insert Appointment
                const addressStr = contact.address ? `${contact.address}, ${contact.city}, ${contact.state} ${contact.zip}` : 'Address Not on File';
                const fullNotes = `Email: ${args.email || 'Not Provided'}\nAddress: ${addressStr}\n\n${args.notes || ''}`;

                // Update Contact Email if provided
                if (args.email) {
                    await supabase.from('contacts')
                        .update({ email: args.email })
                        .eq('id', contact.id);
                }

                // Placeholder for Email Notification
                console.log(`[EMAIL NOTIFICATION] To: Noah (noahgun24@gmail.com) | Subject: New Demo Booked | Body: Contact ${normalizedPhone} booked for ${args.datetime}. Email: ${args.email}`);

                const { error: insertError } = await supabase.from('appointments').insert({
                    contact_id: contact.id,
                    datetime: args.datetime,
                    notes: fullNotes
                });

                if (insertError) {
                    return new Response(JSON.stringify({
                        results: [{
                            toolCallId: toolCall.id,
                            result: `Error: ${insertError.message}`
                        }]
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                // 3. Update Contact Status
                await supabase
                    .from('contacts')
                    .update({ status: 'Appointment Booked' })
                    .eq('id', contact.id);

                // --- GOOGLE CALENDAR SYNC (Individual Account) ---
                try {
                    // Attempt to get campaign from metadata, fallback to residential
                    const campaignName = call.assistant?.metadata?.campaign || 'residential';
                    console.log(`[Google Sync] Looking for user assigned to campaign: ${campaignName}`);

                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('google_refresh_token')
                        .eq('assigned_campaign', campaignName)
                        .not('google_refresh_token', 'is', null)
                        .single();

                    if (profile && profile.google_refresh_token) {
                        console.log(`[Google Sync] User found. Refreshing token...`);

                        // 1. Refresh Token
                        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
                        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

                        if (clientId && clientSecret) {
                            const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                body: new URLSearchParams({
                                    client_id: clientId,
                                    client_secret: clientSecret,
                                    refresh_token: profile.google_refresh_token,
                                    grant_type: 'refresh_token'
                                })
                            });

                            const tokenData = await refreshRes.json();
                            if (tokenData.access_token) {
                                // 2. Create Event
                                const eventBody = {
                                    summary: `Demo with ${contact.firstName || 'Lead'} ${contact.lastName || ''}`,
                                    description: fullNotes,
                                    start: { dateTime: args.datetime }, // dateTime format: '2025-01-01T10:00:00-06:00'
                                    end: { dateTime: new Date(new Date(args.datetime).getTime() + 30 * 60000).toISOString() } // 30 min duration
                                };

                                const calendarRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${tokenData.access_token}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(eventBody)
                                });

                                const calendarData = await calendarRes.json();
                                console.log(`[Google Sync] Event Created: ${calendarData.htmlLink}`);
                            } else {
                                console.error('[Google Sync] Failed to refresh token:', tokenData);
                            }
                        } else {
                            console.error('[Google Sync] Missing Google Credentials in Environment.');
                        }
                    } else {
                        console.log(`[Google Sync] No user found with connected calendar for campaign: ${campaignName}`);
                    }
                } catch (calErr) {
                    console.error('[Google Sync] Error:', calErr);
                    // Do not fail the booking if calendar sync fails
                }

                return new Response(JSON.stringify({
                    results: [{
                        toolCallId: toolCall.id,
                        result: "Appointment booked successfully."
                    }]
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            if (toolCall.function.name === 'update_address') {
                let args = toolCall.function.arguments;
                if (typeof args === 'string') {
                    try { args = JSON.parse(args); } catch (e) { console.error(e); }
                }

                const call = message.call;
                const rawPhoneNumber = call.customer.number;
                const normalizedPhone = rawPhoneNumber.replace(/\D/g, '').slice(-10);
                console.log(`Updating address for ${normalizedPhone}`, args);

                const last4 = normalizedPhone.slice(-4);

                const { data: contacts, error: findError } = await supabase
                    .from('contacts')
                    .select('id, phoneNumber')
                    .ilike('phoneNumber', `%${last4}%`);

                if (findError) throw findError;

                const contact = contacts?.find((c: any) => {
                    return (c.phoneNumber || '').replace(/\D/g, '').slice(-10) === normalizedPhone;
                });

                if (!contact) {
                    return new Response(JSON.stringify({
                        results: [{
                            toolCallId: toolCall.id,
                            result: "Error: Contact not found."
                        }]
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                const { error: updateError } = await supabase
                    .from('contacts')
                    .update({ address: args.new_address })
                    .eq('id', contact.id);

                if (updateError) {
                    return new Response(JSON.stringify({
                        results: [{
                            toolCallId: toolCall.id,
                            result: `Error: ${updateError.message}`
                        }]
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                return new Response(JSON.stringify({
                    results: [{
                        toolCallId: toolCall.id,
                        result: `Address updated to ${args.new_address}. Proceed.`
                    }]
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        // Handle End of Call Report (Logging)
        if (message && message.type === 'end-of-call-report') {
            const call = message.call;
            const recordingUrl = message.recordingUrl || message.stereoRecordingUrl;

            const rawPhoneNumber = call.customer.number;
            const normalizedPhone = rawPhoneNumber.replace(/\D/g, '').slice(-10);
            const last4 = normalizedPhone.slice(-4);

            const { data: contacts } = await supabase
                .from('contacts')
                .select('id, status')
                .ilike('phoneNumber', `%${last4}%`);

            const contact = contacts?.[0];

            if (contact) {
                await supabase.from('call_logs').insert({
                    contact_id: contact.id,
                    duration: call.duration || 0,
                    outcome: call.endedReason || 'Completed',
                    recording_url: recordingUrl,
                    transcript: message.transcript || message.summary || 'No transcript available',
                    sentiment: message.analysis?.sentiment || 'Neutral'
                });
                console.log('Call Log Saved');

                // Update Status Logic (Replicated from server)
                if (contact.status !== 'Appointment Booked') {
                    const newStatus = (call.duration || 0) > 0 ? 'Connected' : 'Attempted';

                    if (contact.status === 'Connected' && newStatus === 'Attempted') {
                        // skip downgrade
                    } else if (contact.status !== newStatus) {
                        await supabase.from('contacts').update({
                            status: newStatus,
                            last_contacted_at: new Date().toISOString()
                        }).eq('id', contact.id);
                    }
                }
            }
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ message: "No tool executed" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
