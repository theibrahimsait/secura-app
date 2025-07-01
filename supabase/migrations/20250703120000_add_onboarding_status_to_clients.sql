ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS onboarding_status JSONB DEFAULT '{}'::jsonb; 