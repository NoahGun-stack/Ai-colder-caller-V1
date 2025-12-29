-- Create Call Logs Table
create table call_logs (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references contacts(id),
  duration integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  outcome text,
  sentiment text,
  transcript text,
  recording_url text
);

-- Enable RLS
alter table call_logs enable row level security;

-- Policies
create policy "Enable all access for all users" on call_logs for all using (true) with check (true);
