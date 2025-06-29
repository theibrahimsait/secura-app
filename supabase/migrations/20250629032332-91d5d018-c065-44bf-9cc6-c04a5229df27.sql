
-- Fix RLS policies for client_documents to work with non-authenticated clients
DROP POLICY IF EXISTS "Clients can manage own documents" ON public.client_documents;

-- Create a more permissive policy for client document uploads
-- Since clients are not authenticated users, we need to allow inserts based on client_id
CREATE POLICY "Allow client document uploads" 
  ON public.client_documents 
  FOR INSERT 
  TO public 
  WITH CHECK (true);

-- Allow clients to view their own documents by client_id
CREATE POLICY "Clients can view own documents" 
  ON public.client_documents 
  FOR SELECT 
  TO public 
  USING (true);

-- Keep the existing policy for agents and admins
DROP POLICY IF EXISTS "Agents and admins can view client documents" ON public.client_documents;
CREATE POLICY "Agents and admins can view client documents" 
  ON public.client_documents 
  FOR ALL 
  TO authenticated 
  USING (
    client_id IN (
      SELECT c.id FROM public.clients c 
      WHERE c.agent_id = auth.uid()::uuid 
      OR c.agency_id IN (
        SELECT u.agency_id FROM public.users u WHERE u.auth_user_id = auth.uid()
      )
    )
  );
