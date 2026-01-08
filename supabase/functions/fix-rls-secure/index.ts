
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

serve(async (req) => {
    try {
        const databaseUrl = Deno.env.get("SUPABASE_DB_URL")!;
        const client = new Client(databaseUrl);
        await client.connect();

        // Secure Policy:
        // 1. Enable RLS
        // 2. Allow SELECT/DELETE strictly based on ownership of the parent CONTACT.
        // This uses a join (effectively) which isn't standard in simple RLS without a security definer view or subquery.
        // The subquery `contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())` is the standard way.

        const sql = `
      alter table call_logs enable row level security;
      
      drop policy if exists "Enable all access for all users" on call_logs;
      drop policy if exists "Allow delete for all authenticated users" on call_logs;
      drop policy if exists "Users can manage their own call logs" on call_logs;

      create policy "Users can manage their own call logs" 
      on call_logs 
      for all 
      using (
        contact_id in (
            select id from contacts 
            where user_id = auth.uid()
        )
      )
      with check (
        contact_id in (
            select id from contacts 
            where user_id = auth.uid()
        )
      );
    `;

        await client.queryArray(sql);
        await client.end();

        return new Response(JSON.stringify({ message: "Secure RLS Applied" }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
