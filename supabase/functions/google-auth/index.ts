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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url); // e.g. https://project.supabase.co/functions/v1/google-auth?code=...

    // 1. GET /google-auth -> Redirect to Google
    if (!url.searchParams.has('code')) {
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const redirectUri = `${url.origin}${url.pathname}`; // Auto-detect current function URL

        if (!clientId) {
            return new Response("Missing GOOGLE_CLIENT_ID", { status: 500 });
        }

        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/userinfo.email'
        ].join(' ');

        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`;

        return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, "Location": googleAuthUrl }
        });
    }

    // 2. GET /google-auth?code=... -> Callback
    try {
        const code = url.searchParams.get('code');
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
        const redirectUri = `${url.origin}${url.pathname}`;

        if (!code || !clientId || !clientSecret) {
            throw new Error("Missing config or code");
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        const tokens = await tokenResponse.json();
        if (tokens.error) throw new Error(tokens.error_description || tokens.error);

        // Get User Info from Google to identify/verify
        const userRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const googleUser = await userRes.json();

        // IMPORTANT: We need to link this to a Supabase User.
        // Since this is a redirect flow, we can't easily get the logged-in user session unless we passed a state or cookie.
        // SIMPLE APPROACH: Match by Email in the profiles table.
        // If the Google Email matches a Profile Email, we update that profile.

        const { data: profile, error: findError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', googleUser.email)
            .single();

        if (findError || !profile) {
            return new Response(`Error: No user found in system with email ${googleUser.email}. Please ensure your Google Email matches your dashboard email.`, { headers: corsHeaders });
        }

        // Update Profile with Tokens
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                google_refresh_token: tokens.refresh_token, // Only sent on first consent (offline access)
                google_access_token: tokens.access_token,
                google_token_expiry: Date.now() + (tokens.expires_in * 1000)
            })
            .eq('id', profile.id);

        if (updateError) throw updateError;

        return new Response("Success! Your Google Calendar is now connected. You can close this window.", {
            headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        });

    } catch (err: any) {
        console.error(err);
        return new Response(`Auth Failed: ${err.message}`, { status: 500, headers: corsHeaders });
    }
});
