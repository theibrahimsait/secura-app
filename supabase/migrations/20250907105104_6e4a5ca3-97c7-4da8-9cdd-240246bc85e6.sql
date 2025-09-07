-- Clean up any insecure previous overload that accepted a parameter
DROP FUNCTION IF EXISTS public.get_user_profile_for_auth(text);

-- Secure profile lookup/link for agents/agencies during auth
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
  caller_email text;
  link_id uuid;
BEGIN
  -- Bind to the caller’s JWT subject (prevents impersonation)
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN; -- not authenticated
  END IF;

  -- 1) Try by auth_user_id (should be unique)
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

  -- 2) Link by the caller’s JWT email if present and unclaimed
  caller_email := (auth.jwt() ->> 'email');

  IF caller_email IS NOT NULL THEN
    -- Pick a single candidate row deterministically
    SELECT u.id
    INTO link_id
    FROM public.users u
    WHERE u.email = caller_email
      AND u.auth_user_id IS NULL
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

  -- Nothing found/linked → return empty set
  RETURN;
END;
$$;

-- Lock down execution: only authenticated users may call
REVOKE ALL ON FUNCTION public.get_user_profile_for_auth() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_profile_for_auth() TO authenticated;