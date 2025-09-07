-- Harden get_user_profile_for_auth: case-insensitive email match, trimmed, and fallback when auth.jwt() email not available
-- Keep SECURITY DEFINER and safe search_path

CREATE OR REPLACE FUNCTION public.get_user_profile_for_auth()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  role user_role,
  agency_id uuid,
  phone text,
  created_at timestamptz,
  updated_at timestamptz,
  auth_user_id uuid,
  is_active boolean,
  created_by uuid,
  last_login timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
DECLARE
  uid uuid;
  caller_email_raw text;
  caller_email_ci text; -- lower(trim(email))
  link_id uuid;
BEGIN
  -- Bind to caller
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN; -- not authenticated
  END IF;

  -- 1) Try by auth_user_id first
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.role, u.agency_id, u.phone,
         u.created_at, u.updated_at, u.auth_user_id, u.is_active,
         u.created_by, u.last_login
  FROM public.users u
  WHERE u.auth_user_id = uid
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- 2) Determine caller's email with fallbacks
  caller_email_raw := (auth.jwt() ->> 'email');
  IF caller_email_raw IS NULL THEN
    -- Fallback: read from auth.users if available
    SELECT email INTO caller_email_raw FROM auth.users WHERE id = uid LIMIT 1;
  END IF;

  IF caller_email_raw IS NOT NULL THEN
    caller_email_ci := lower(trim(caller_email_raw));

    -- Find an unlinked user row matching the email (case/space insensitive)
    SELECT u.id
    INTO link_id
    FROM public.users u
    WHERE u.auth_user_id IS NULL
      AND lower(trim(u.email)) = caller_email_ci
    ORDER BY u.created_at ASC, u.id ASC
    LIMIT 1;

    IF link_id IS NOT NULL THEN
      UPDATE public.users
      SET auth_user_id = uid, updated_at = now()
      WHERE id = link_id;

      RETURN QUERY
      SELECT u.id, u.email, u.full_name, u.role, u.agency_id, u.phone,
             u.created_at, u.updated_at, u.auth_user_id, u.is_active,
             u.created_by, u.last_login
      FROM public.users u
      WHERE u.id = link_id
      LIMIT 1;
      RETURN;
    END IF;
  END IF;

  -- Nothing to return
  RETURN;
END;
$$;

-- Ensure execution is restricted appropriately
REVOKE ALL ON FUNCTION public.get_user_profile_for_auth() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_profile_for_auth() TO authenticated;