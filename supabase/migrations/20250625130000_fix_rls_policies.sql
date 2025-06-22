-- Fix RLS Policies for users table
-- This migration consolidates and fixes all RLS policies

-- First, disable RLS temporarily to clean up policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Superadmin can view all users" ON public.users;
DROP POLICY IF EXISTS "Agency admin can view agency users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read for authenticated users based on role" ON public.users;
DROP POLICY IF EXISTS "Enable insert for superadmin" ON public.users;
DROP POLICY IF EXISTS "Enable update for own record or superadmin" ON public.users;
DROP POLICY IF EXISTS "Agency admins can create users for their own agency" ON public.users;
DROP POLICY IF EXISTS "Superadmins can create any user" ON public.users;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- SELECT policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Superadmin can view all users" ON public.users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Agency admin can view agency users" ON public.users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() 
        AND u.role = 'agency_admin'
        AND u.agency_id = users.agency_id
    )
  );

-- INSERT policies
CREATE POLICY "Superadmin can create any user" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Agency admin can create users for their agency" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() 
        AND u.role = 'agency_admin'
        AND u.agency_id = users.agency_id
    )
  );

-- UPDATE policies
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Superadmin can update any user" ON public.users
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Agency admin can update agency users" ON public.users
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() 
        AND u.role = 'agency_admin'
        AND u.agency_id = users.agency_id
    )
  );

-- DELETE policies (if needed)
CREATE POLICY "Superadmin can delete any user" ON public.users
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Agency admin can delete agency users" ON public.users
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() 
        AND u.role = 'agency_admin'
        AND u.agency_id = users.agency_id
        AND users.role != 'agency_admin' -- Prevent agency admins from deleting other agency admins
    )
  ); 