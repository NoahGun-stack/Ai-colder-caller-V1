-- Enable RLS (idempotent)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for all users" ON appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can insert their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON appointments;

-- 1. VIEW / SELECT
CREATE POLICY "Users can view their own appointments"
ON appointments FOR SELECT
USING (
  contact_id IN (
    SELECT id FROM contacts WHERE user_id = auth.uid()
  )
);

-- 2. INSERT
CREATE POLICY "Users can insert their own appointments"
ON appointments FOR INSERT
WITH CHECK (
  contact_id IN (
    SELECT id FROM contacts WHERE user_id = auth.uid()
  )
);

-- 3. UPDATE
CREATE POLICY "Users can update their own appointments"
ON appointments FOR UPDATE
USING (
  contact_id IN (
    SELECT id FROM contacts WHERE user_id = auth.uid()
  )
);

-- 4. DELETE
CREATE POLICY "Users can delete their own appointments"
ON appointments FOR DELETE
USING (
  contact_id IN (
    SELECT id FROM contacts WHERE user_id = auth.uid()
  )
);
