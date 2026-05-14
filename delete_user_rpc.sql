-- Create a secure RPC function that allows admins to delete users from auth.users
-- This will cascade and delete the user's profile as well.
create or replace function admin_delete_user(target_user_id uuid)
returns void as $$
begin
  -- Verify the calling user is an admin
  if exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    -- Delete user from auth.users (cascades to profiles)
    delete from auth.users where id = target_user_id;
  else
    raise exception 'Unauthorized: Only admins can delete users';
  end if;
end;
$$ language plpgsql security definer;
