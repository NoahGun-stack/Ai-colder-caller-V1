
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

serve(async (req) => {
    try {
        // 1. Connect to DB
        const databaseUrl = Deno.env.get("SUPABASE_DB_URL")!;
        const client = new Client(databaseUrl);
        await client.connect();

        // 2. SQL to Fix RLS
        const sql = `
      alter table call_logs enable row level security;
      drop policy if exists "Enable all access for all users" on call_logs;
      drop policy if exists "Allow delete for all authenticated users" on call_logs;
      create policy "Enable all access for all users" on call_logs for all using (true) with check (true);
    `;

        // 3. Execute
        await client.queryArray(sql);
        await client.end();

        return new Response(JSON.stringify({ message: "RLS Fixed Successfully" }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
