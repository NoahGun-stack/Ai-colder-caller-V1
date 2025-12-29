-- Secure Appointments
-- First, drop the insecure "allow all" policy
drop policy if exists "Enable all access for all users" on appointments;

-- Create secure policies that check ownership via the contact relationship
create policy "Users can view their own appointments"
  on appointments for select
  using (
    exists (
      select 1 from contacts
      where contacts.id = appointments.contact_id
      and contacts.user_id = auth.uid()
    )
  );

create policy "Users can insert appointments for their contacts"
  on appointments for insert
  with check (
    exists (
      select 1 from contacts
      where contacts.id = appointments.contact_id
      and contacts.user_id = auth.uid()
    )
  );

-- Secure Call Logs
drop policy if exists "Enable all access for all users" on call_logs;

create policy "Users can view their own call logs"
  on call_logs for select
  using (
    exists (
      select 1 from contacts
      where contacts.id = call_logs.contact_id
      and contacts.user_id = auth.uid()
    )
  );
