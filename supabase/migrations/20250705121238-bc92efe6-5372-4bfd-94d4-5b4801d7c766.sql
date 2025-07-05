-- Create a function to resolve referral code to agency context
CREATE OR REPLACE FUNCTION public.resolve_referral_context(referral_code TEXT)
RETURNS TABLE (
  agency_id UUID,
  agency_name TEXT,
  agent_id UUID,
  agent_name TEXT,
  agency_logo_url TEXT,
  agency_primary_color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Try to find referral link by ID first (existing system)
  IF referral_code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY
    SELECT 
      a.id as agency_id,
      a.name as agency_name,
      u.id as agent_id,
      u.full_name as agent_name,
      a.logo_url as agency_logo_url,
      a.primary_color as agency_primary_color
    FROM referral_links rl
    JOIN agencies a ON rl.agency_id = a.id
    JOIN users u ON rl.agent_id = u.id
    WHERE rl.id = referral_code::UUID;
  ELSE
    -- Try to find by slug (new system)
    RETURN QUERY
    SELECT 
      a.id as agency_id,
      a.name as agency_name,
      u.id as agent_id,
      u.full_name as agent_name,
      a.logo_url as agency_logo_url,
      a.primary_color as agency_primary_color
    FROM referral_links rl
    JOIN agencies a ON rl.agency_id = a.id
    JOIN users u ON rl.agent_id = u.id
    WHERE rl.slug = referral_code;
  END IF;
END;
$$;