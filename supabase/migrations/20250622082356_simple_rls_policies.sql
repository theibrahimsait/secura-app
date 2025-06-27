
-- First, disable RLS temporarily to fix the policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Superadmin can read all users" ON public.users;
DROP POLICY IF EXISTS "Superadmin can create users" ON public.users;
DROP POLICY IF EXISTS "Superadmin can update all users" ON public.users;

-- Create or update the superadmin user record
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
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive RLS policies
CREATE POLICY "Enable read for authenticated users based on role" ON public.users
  FOR SELECT USING (
    CASE 
      WHEN role = 'superadmin' THEN true
      WHEN role = 'agency_admin' THEN (auth.uid()::text = auth_user_id::text OR agency_id = (
        SELECT agency_id FROM public.users WHERE auth_user_id::text = auth.uid()::text
      ))
      WHEN role = 'agent' THEN (auth.uid()::text = auth_user_id::text OR agency_id = (
        SELECT agency_id FROM public.users WHERE auth_user_id::text = auth.uid()::text
      ))
      ELSE auth.uid()::text = auth_user_id::text
    END
  );

CREATE POLICY "Enable insert for superadmin" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id::text = auth.uid()::text 
      AND role = 'superadmin'
    )
  );

CREATE POLICY "Enable update for own record or superadmin" ON public.users
  FOR UPDATE USING (
    auth.uid()::text = auth_user_id::text 
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id::text = auth.uid()::text 
      AND role = 'superadmin'
    )
  );
