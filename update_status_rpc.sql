-- Function to safely update contact status without overwriting "Appointment Booked"
create or replace function update_contact_status_if_needed(contact_uuid uuid, new_status text)
returns void as $$
begin
  update contacts
  set 
    status = new_status,
    last_contacted_at = now()
  where 
    id = contact_uuid 
    and status != 'Appointment Booked' -- Never downgrade a booked lead
    and (status is null or status = 'Not Called' or status = 'Attempted' or (status = 'Connected' and new_status = 'Connected'));
end;
$$ language plpgsql;
