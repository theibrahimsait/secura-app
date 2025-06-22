-- Fix RLS Policies for agencies table
-- Ensure superadmin can properly access agencies table

-- First, disable RLS temporarily to clean up policies
ALTER TABLE public.agencies DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Superadmin can view all agencies" ON public.agencies;
DROP POLICY IF EXISTS "Agency admin can view own agency" ON public.agencies;

-- Re-enable RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- SELECT policies
CREATE POLICY "Superadmin can view all agencies" ON public.agencies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Agency admin can view own agency" ON public.agencies
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT agency_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'agency_admin'
    )
  );

-- INSERT policies
CREATE POLICY "Superadmin can create agencies" ON public.agencies
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'superadmin'
    )
  );

-- UPDATE policies
CREATE POLICY "Superadmin can update agencies" ON public.agencies
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'superadmin'
    )
  );

-- DELETE policies
CREATE POLICY "Superadmin can delete agencies" ON public.agencies
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'superadmin'
    )
  ); 