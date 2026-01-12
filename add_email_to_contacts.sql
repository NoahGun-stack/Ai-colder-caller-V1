-- Add email column to contacts table if it doesn't exist
alter table contacts 
add column if not exists email text;

-- Verify it was added
select * from contacts limit 1;
