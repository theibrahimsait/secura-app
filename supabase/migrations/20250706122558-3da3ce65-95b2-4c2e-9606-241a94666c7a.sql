-- Fix the mark_submission_updates_as_read function for better client authentication
CREATE OR REPLACE FUNCTION public.mark_submission_updates_as_read(p_submission_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  current_client_id uuid;
  user_role text;
BEGIN
  -- Auto-detect role from JWT
  user_role := (auth.jwt() -> 'app_metadata' ->> 'role');
  
  IF user_role = 'client' OR user_role IS NULL THEN
    -- Client context - use client session authentication
    current_client_id := get_client_id_from_session_readonly();
    
    IF current_client_id IS NOT NULL THEN
      -- Mark admin messages as read for this client
      UPDATE submission_updates 
      SET is_read = true
      WHERE submission_id = p_submission_id
      AND sender_role = 'admin'  -- Only mark admin messages as read
      AND submission_id IN (
        SELECT pas.id 
        FROM property_agency_submissions pas
        WHERE pas.client_id = current_client_id
      );
    END IF;
    
  ELSE
    -- Agency staff context (admin)
    SELECT users.id INTO current_user_id 
    FROM users 
    WHERE users.auth_user_id = auth.uid();
    
    IF current_user_id IS NOT NULL THEN
      -- Mark client messages as read for this admin
      UPDATE submission_updates 
      SET is_read = true
      WHERE submission_id = p_submission_id
      AND sender_role = 'client'  -- Only mark client messages as read
      AND submission_id IN (
        SELECT pas.id 
        FROM property_agency_submissions pas
        WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
        AND user_role = 'agency_admin'
      );
    END IF;
  END IF;
END;
$function$;