
-- 1. Secure Call Logs
alter table call_logs enable row level security;

-- Drop insecure dev policy if it exists
drop policy if exists "Enable all access for all users" on call_logs;

-- Add strict ownership policies
create policy "Users can view logs of their own contacts"
on call_logs for select
using ( exists (
  select 1 from contacts
  where contacts.id = call_logs.contact_id
  and contacts.user_id = auth.uid()
));

create policy "Users can insert logs for their own contacts"
on call_logs for insert
with check ( exists (
  select 1 from contacts
  where contacts.id = call_logs.contact_id
  and contacts.user_id = auth.uid()
));

-- 2. Secure Appointments
alter table appointments enable row level security;

-- Drop insecure dev policy if it exists
drop policy if exists "Enable all access for all users" on appointments;

-- Add strict ownership policies
create policy "Users can view appointments of their own contacts"
on appointments for select
using ( exists (
  select 1 from contacts
  where contacts.id = appointments.contact_id
  and contacts.user_id = auth.uid()
));

create policy "Users can insert appointments for their own contacts"
on appointments for insert
with check ( exists (
  select 1 from contacts
  where contacts.id = appointments.contact_id
  and contacts.user_id = auth.uid()
));
