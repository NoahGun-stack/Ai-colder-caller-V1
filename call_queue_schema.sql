-- Create Call Queue Table
create table public.call_queue (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  contact_id uuid references public.contacts(id) on delete cascade not null,
  status text not null default 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  attempts int default 0
);

-- Enable RLS
alter table public.call_queue enable row level security;

-- Policies
create policy "Users can view their own queue"
  on public.call_queue for select
  using ( auth.uid() = user_id );

create policy "Users can insert into their own queue"
  on public.call_queue for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own queue"
  on public.call_queue for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own queue"
  on public.call_queue for delete
  using ( auth.uid() = user_id );

-- Index for faster fetching of pending items
create index idx_call_queue_status_created on public.call_queue(status, created_at);
create index idx_call_queue_contact_id on public.call_queue(contact_id);
