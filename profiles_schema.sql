-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text default 'user', -- 'admin' or 'user'
  assigned_campaign text default 'residential', -- 'residential' or 'b2b'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a trigger to automatically create a profile entry when a new user signs up
-- This ensures every user in auth.users has a corresponding row in public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, assigned_campaign)
  values (
    new.id, 
    new.email, 
    case when new.email = 'noahgun24@gmail.com' then 'admin' else 'user' end,
    'residential'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-grant admin to specific user if they already exist
update profiles
set role = 'admin'
where email = 'noahgun24@gmail.com';
