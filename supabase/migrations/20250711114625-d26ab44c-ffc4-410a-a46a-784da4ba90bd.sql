-- Add UPDATE policy for agency_notifications so agency admins can mark notifications as read
CREATE POLICY "Agency admins can update their notifications" 
ON agency_notifications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth.uid() = users.auth_user_id 
    AND users.role = 'agency_admin'::user_role 
    AND users.agency_id = agency_notifications.agency_id
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth.uid() = users.auth_user_id 
    AND users.role = 'agency_admin'::user_role 
    AND users.agency_id = agency_notifications.agency_id
  )
);