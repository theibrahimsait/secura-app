-- Fix the referral trigger to use the correct referral_links table
-- instead of agent_referral_links table

CREATE OR REPLACE FUNCTION public.set_client_agent_from_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If a referral_token is provided, find the corresponding link and set agent/agency
  IF NEW.referral_token IS NOT NULL THEN
    UPDATE public.clients 
    SET 
      agent_id = (SELECT agent_id FROM public.referral_links WHERE id = NEW.referral_token::uuid),
      agency_id = (SELECT agency_id FROM public.referral_links WHERE id = NEW.referral_token::uuid)
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;