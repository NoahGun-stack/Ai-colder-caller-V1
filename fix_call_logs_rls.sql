
-- Enable RLS (idempotent)
alter table call_logs enable row level security;

-- Drop existing restrictive policies if any (to be safe)
drop policy if exists "Enable all access for all users" on call_logs;
drop policy if exists "Allow delete for all authenticated users" on call_logs;

-- Create a permissive policy
-- Since call_logs are often managed by the system or linked to contacts the user owns, 
-- and we want to allow the "Clear All" button to work easily for the MVP:
create policy "Enable all access for all users" 
on call_logs 
for all 
using (true) 
with check (true);
