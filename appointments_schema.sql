-- Create Appointments Table
create table appointments (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  contact_id uuid references contacts(id),
  datetime timestamp with time zone not null,
  notes text,
  status text default 'scheduled'
);

-- Enable RLS
alter table appointments enable row level security;

-- Policies (Public for now, assuming local dev/demo)
create policy "Enable all access for all users" on appointments for all using (true) with check (true);
