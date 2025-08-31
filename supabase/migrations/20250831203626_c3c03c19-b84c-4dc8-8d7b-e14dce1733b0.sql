-- Create robust client_next_route function that does not reference columns directly
-- and is safe across envs where columns may be missing
CREATE OR REPLACE FUNCTION public.client_next_route(p_client_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  client_json jsonb;
  completed boolean;
  status jsonb;
BEGIN
  -- Load the entire row as JSONB to avoid parse-time dependency on specific columns
  SELECT to_jsonb(c) INTO client_json
  FROM public.clients c
  WHERE c.id = p_client_id
  LIMIT 1;

  IF client_json IS NULL THEN
    -- If client not found, default to onboarding (safe default)
    RETURN 'onboarding';
  END IF;

  -- Prefer explicit onboarding_completed when present
  IF client_json ? 'onboarding_completed' THEN
    BEGIN
      completed := COALESCE((client_json ->> 'onboarding_completed')::boolean, false);
    EXCEPTION WHEN others THEN
      completed := false;
    END;

    IF completed THEN
      RETURN 'dashboard';
    END IF;
  END IF;

  -- Fallback: onboarding_status JSON has a "completed" flag
  IF client_json ? 'onboarding_status' THEN
    status := client_json -> 'onboarding_status';
    BEGIN
      IF COALESCE((status ->> 'completed')::boolean, false) THEN
        RETURN 'dashboard';
      END IF;
    EXCEPTION WHEN others THEN
      -- ignore parse issues and fall through
    END;
  END IF;

  RETURN 'onboarding';
END;
$$;

-- Lock down permissions
REVOKE ALL ON FUNCTION public.client_next_route(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_next_route(uuid) TO anon, authenticated;