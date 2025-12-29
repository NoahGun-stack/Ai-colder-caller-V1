
create table if not exists dnc_list (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  "phoneNumber" text not null,
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, "phoneNumber")
);

alter table dnc_list enable row level security;

-- Policies
create policy "Users can view their own DNC list"
  on dnc_list for select
  using ( auth.uid() = user_id );

create policy "Users can insert into their own DNC list"
  on dnc_list for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete from their own DNC list"
  on dnc_list for delete
  using ( auth.uid() = user_id );

-- Bulk Scrub Function
create or replace function scrub_dnc_contacts()
returns void as $$
begin
  update contacts
  set status = 'Do Not Call'
  from dnc_list
  where 
    contacts.user_id = auth.uid() 
    and dnc_list.user_id = auth.uid()
    and contacts."phoneNumber" = dnc_list."phoneNumber";
end;
$$ language plpgsql;
