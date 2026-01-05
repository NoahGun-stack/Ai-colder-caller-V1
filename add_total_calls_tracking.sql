-- Add total_calls column to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS total_calls integer DEFAULT 0;

-- Update function to increment total_calls
create or replace function update_contact_status_if_needed(contact_uuid uuid, new_status text)
returns void as $$
begin
  update contacts
  set 
    status = new_status,
    last_contacted_at = now(),
    total_calls = coalesce(total_calls, 0) + 1
  where 
    id = contact_uuid 
    and status != 'Appointment Booked' -- Never downgrade a booked lead
    and (status is null or status = 'Not Called' or status = 'Attempted' or (status = 'Connected' and new_status = 'Connected'));
end;
$$ language plpgsql;
