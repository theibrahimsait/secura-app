
-- Enable RLS on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert into users table (for creating agents)
CREATE POLICY "Allow authenticated users to insert users" 
ON public.users 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to view users in their agency
CREATE POLICY "Users can view users in their agency" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (
  -- Allow viewing users in the same agency
  agency_id IN (
    SELECT agency_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
  OR
  -- Allow superadmins to view all users
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Allow agency admins to update users in their agency
CREATE POLICY "Agency admins can update users in their agency" 
ON public.users 
FOR UPDATE 
TO authenticated 
USING (
  -- Allow updating users in the same agency if user is agency_admin
  agency_id IN (
    SELECT agency_id 
    FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'agency_admin'
  )
  OR
  -- Allow superadmins to update all users
  EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'superadmin'
  )
);
