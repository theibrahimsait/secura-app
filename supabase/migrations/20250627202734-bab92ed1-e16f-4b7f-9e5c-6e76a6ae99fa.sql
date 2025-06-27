
-- Add a temporary policy to allow agency admins to view agents using table-based lookup
-- This will work alongside the JWT-based policies
CREATE POLICY "Agency admin can view agency agents via table lookup" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() 
        AND u.role = 'agency_admin'
        AND u.agency_id = users.agency_id
        AND users.role = 'agent'
    )
  );
