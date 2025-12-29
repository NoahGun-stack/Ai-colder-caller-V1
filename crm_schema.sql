
-- Add CRM columns to contacts
alter table contacts
add column if not exists total_calls integer default 0,
add column if not exists last_contacted_at timestamp with time zone,
add column if not exists last_outcome text;

-- Function to update stats on new call log
create or replace function update_contact_stats()
returns trigger as $$
begin
  update contacts
  set
    total_calls = coalesce(total_calls, 0) + 1, -- Ensure we increment correctly even if null
    last_contacted_at = new.created_at,
    last_outcome = new.outcome
  where id = new.contact_id;
  return new;
end;
$$ language plpgsql;

-- Trigger
drop trigger if exists on_call_log_insert on call_logs;
create trigger on_call_log_insert
after insert on call_logs
for each row
execute function update_contact_stats();
