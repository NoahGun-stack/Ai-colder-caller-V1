-- Add cost column to call_logs table
ALTER TABLE public.call_logs
ADD COLUMN IF NOT EXISTS cost numeric DEFAULT 0;

-- Comment on column
COMMENT ON COLUMN public.call_logs.cost IS 'Cost of the call in USD provided by Vapi';
