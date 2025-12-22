create table leads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  "firstName" text not null,
  "lastName" text not null,
  "phoneNumber" text not null,
  address text,
  city text,
  state text,
  zip text,
  status text default 'Not Called',
  "tcpaAcknowledged" boolean default false,
  notes text
);

alter table leads enable row level security;

create policy "Users can view their own leads"
  on leads for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own leads"
  on leads for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own leads"
  on leads for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own leads"
  on leads for delete
  using ( auth.uid() = user_id );
