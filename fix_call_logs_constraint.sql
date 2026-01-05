-- Fix Foreign Key Constraint on call_logs
-- This script changes the behavior of contact deletion to automatically delete associated call logs.

ALTER TABLE call_logs
DROP CONSTRAINT IF EXISTS call_logs_contact_id_fkey;

ALTER TABLE call_logs
ADD CONSTRAINT call_logs_contact_id_fkey
FOREIGN KEY (contact_id)
REFERENCES contacts(id)
ON DELETE CASCADE;
