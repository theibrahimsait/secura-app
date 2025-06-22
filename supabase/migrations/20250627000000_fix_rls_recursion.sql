-- Fix RLS recursion issue by using SECURITY DEFINER functions

-- 1. Create helper functions to get current user's role and agency_id
-- These functions run with the privileges of the definer, bypassing RLS.
-- This is safe as they only query for the currently authenticated user.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_role user_role;
BEGIN
  SELECT role INTO my_role FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  RETURN my_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_agency_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_agency_id UUID;
BEGIN
  SELECT agency_id INTO my_agency_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  RETURN my_agency_id;
END;
$$;


-- 2. Fix policies on public.users table

-- Drop old recursive policies
DROP POLICY IF EXISTS "Superadmin can view all users" ON public.users;
DROP POLICY IF EXISTS "Agency admin can view agency users" ON public.users;
DROP POLICY IF EXISTS "Superadmin can create any user" ON public.users;
DROP POLICY IF EXISTS "Agency admin can create users for their agency" ON public.users;
DROP POLICY IF EXISTS "Superadmin can update any user" ON public.users;
DROP POLICY IF EXISTS "Agency admin can update agency users" ON public.users;
DROP POLICY IF EXISTS "Superadmin can delete any user" ON public.users;
DROP POLICY IF EXISTS "Agency admin can delete agency users" ON public.users;

-- Recreate SELECT policies
CREATE POLICY "Superadmin can view all users" ON public.users
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'superadmin');

CREATE POLICY "Agency admin can view users in their agency" ON public.users
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'agency_admin' AND agency_id = public.get_my_agency_id()
  );

-- Recreate INSERT policies
CREATE POLICY "Superadmin can create any user" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'superadmin');

CREATE POLICY "Agency admin can create users for their agency" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'agency_admin' AND agency_id = public.get_my_agency_id()
  );

-- Recreate UPDATE policies
CREATE POLICY "Superadmin can update any user" ON public.users
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'superadmin')
  WITH CHECK (public.get_my_role() = 'superadmin');

CREATE POLICY "Agency admin can update users in their agency" ON public.users
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'agency_admin' AND agency_id = public.get_my_agency_id())
  WITH CHECK (public.get_my_role() = 'agency_admin' AND agency_id = public.get_my_agency_id());

-- Recreate DELETE policies
CREATE POLICY "Superadmin can delete any user" ON public.users
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'superadmin');

CREATE POLICY "Agency admin can delete users in their agency" ON public.users
  FOR DELETE TO authenticated
  USING (
    public.get_my_role() = 'agency_admin'
    AND agency_id = public.get_my_agency_id()
    AND role != 'agency_admin' -- Prevent deleting other admins
  );


-- 3. Fix policies on public.agencies table

-- Drop old recursive policies
DROP POLICY IF EXISTS "Superadmin can view all agencies" ON public.agencies;
DROP POLICY IF EXISTS "Agency admin can view own agency" ON public.agencies;
DROP POLICY IF EXISTS "Superadmin can create agencies" ON public.agencies;
DROP POLICY IF EXISTS "Superadmin can update agencies" ON public.agencies;
DROP POLICY IF EXISTS "Superadmin can delete agencies" ON public.agencies;

-- Recreate SELECT policies
CREATE POLICY "Superadmin can view all agencies" ON public.agencies
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'superadmin');

CREATE POLICY "Users can view their own agency" ON public.agencies
  FOR SELECT TO authenticated
  USING (id = public.get_my_agency_id());

-- Recreate INSERT policies
CREATE POLICY "Superadmin can create agencies" ON public.agencies
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'superadmin');

-- Recreate UPDATE policies
CREATE POLICY "Superadmin can update agencies" ON public.agencies
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'superadmin');

-- Recreate DELETE policies
CREATE POLICY "Superadmin can delete agencies" ON public.agencies
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'superadmin'); 