-- RLS Policies for inserting users

CREATE POLICY "Agency admins can create users for their own agency"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'agency_admin'
      AND u.agency_id = users.agency_id -- `users` here refers to the new row being inserted
  )
);

CREATE POLICY "Superadmins can create any user"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'superadmin'
  )
); 