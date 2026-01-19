-- Add Google OAuth fields to UserProfile
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expiry BIGINT;

-- Security: Enable RLS on these columns if needed, but profiles is usually restrictive.
-- Ensuring admins/users can read their own data is handled by existing policies.
