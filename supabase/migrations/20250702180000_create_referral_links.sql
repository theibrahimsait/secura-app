-- Create referral_links table for persistent agent referral links
CREATE TABLE public.referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
); 