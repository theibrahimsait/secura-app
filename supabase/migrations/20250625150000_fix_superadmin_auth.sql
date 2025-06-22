-- Fix superadmin authentication setup
-- Ensure the superadmin user can be properly authenticated

-- First, let's check if the superadmin exists and has the right email
DO $$
BEGIN
  -- Update superadmin email if it doesn't match
  UPDATE public.users 
  SET email = 'theibrahimsait@gmail.com',
      full_name = 'Ibrahim Sait',
      updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001' 
    AND role = 'superadmin';
  
  -- If no rows were updated, insert the superadmin
  IF NOT FOUND THEN
    INSERT INTO public.users (
      id,
      email,
      full_name,
      role,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      'theibrahimsait@gmail.com',
      'Ibrahim Sait',
      'superadmin',
      true,
      now(),
      now()
    );
  END IF;
END $$;

-- Create a function to help with superadmin authentication
CREATE OR REPLACE FUNCTION public.get_superadmin_auth_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Try to find the auth user by email
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'theibrahimsait@gmail.com'
  LIMIT 1;
  
  RETURN auth_user_id;
END;
$$;

-- Update the superadmin user with auth_user_id if we can find it
UPDATE public.users 
SET auth_user_id = public.get_superadmin_auth_user_id(),
    updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001' 
  AND role = 'superadmin'
  AND auth_user_id IS NULL; 