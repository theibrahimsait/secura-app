-- Add RLS policy for agents to view client properties they manage
CREATE POLICY "Agents can view submitted properties" 
ON public.client_properties 
FOR SELECT 
USING (
  id IN (
    SELECT property_agency_submissions.property_id
    FROM property_agency_submissions
    WHERE property_agency_submissions.agent_id = (
      SELECT users.id 
      FROM users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.role = 'agent'
    )
  )
);