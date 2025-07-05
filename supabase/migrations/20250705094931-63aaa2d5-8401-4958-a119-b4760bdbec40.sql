-- Restructure schema for proper real estate platform logic

-- 1. Remove agent_id and agency_id from client_properties table
-- These belong in property_agency_submissions, not in the client's portfolio
ALTER TABLE public.client_properties 
DROP COLUMN IF EXISTS agent_id,
DROP COLUMN IF EXISTS agency_id,
DROP COLUMN IF EXISTS submitted_at;

-- 2. Clean up redundant submission tables - keep only property_agency_submissions
-- Drop the other submission tables that create confusion
DROP TABLE IF EXISTS public.submission_properties CASCADE;
DROP TABLE IF EXISTS public.property_submissions CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;

-- 3. Fix property_documents linking to client_properties
-- Add client_property_id to properly link documents to client portfolio
ALTER TABLE public.property_documents 
ADD COLUMN IF NOT EXISTS client_property_id UUID;

-- Add foreign key constraint for client_property_id
ALTER TABLE public.property_documents
ADD CONSTRAINT fk_property_documents_client_property
FOREIGN KEY (client_property_id) REFERENCES public.client_properties(id) ON DELETE CASCADE;

-- Update existing property_documents to link to client_properties
-- This assumes property_id in property_documents currently refers to client_properties
UPDATE public.property_documents 
SET client_property_id = property_id 
WHERE client_property_id IS NULL 
AND property_id IN (SELECT id FROM public.client_properties);

-- 4. Add audit columns to main tables for tracking
ALTER TABLE public.client_properties 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

ALTER TABLE public.property_documents 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

ALTER TABLE public.property_agency_submissions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

-- 5. Ensure property_agency_submissions has all needed columns
-- Make agent_id optional (can be NULL if submitted directly to agency)
ALTER TABLE public.property_agency_submissions 
ALTER COLUMN agent_id DROP NOT NULL;

-- Add any missing status tracking columns
ALTER TABLE public.property_agency_submissions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sold_by UUID REFERENCES public.users(id);

-- 6. Update RLS policies for the cleaned schema

-- Drop old policies that reference deleted tables
DROP POLICY IF EXISTS "Clients can view their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Clients can create submissions" ON public.submissions;
DROP POLICY IF EXISTS "Agents can view their submissions" ON public.submissions;
DROP POLICY IF EXISTS "Agency admins can view agency submissions" ON public.submissions;
DROP POLICY IF EXISTS "Clients can view their submission properties" ON public.submission_properties;
DROP POLICY IF EXISTS "Clients can create submission properties" ON public.submission_properties;
DROP POLICY IF EXISTS "Agents can view their submission properties" ON public.submission_properties;
DROP POLICY IF EXISTS "Agency admins can view agency submission properties" ON public.submission_properties;

-- Update client_properties RLS policies (remove old agency-based policies)
DROP POLICY IF EXISTS "Agency admins can view submitted properties" ON public.client_properties;
DROP POLICY IF EXISTS "Agents can view their referred properties" ON public.client_properties;

-- Create new RLS policy for property_agency_submissions
CREATE POLICY "Clients can view their property submissions"
ON public.property_agency_submissions
FOR SELECT
USING (client_id IN (
  SELECT id FROM public.clients 
  WHERE phone = current_setting('app.current_client_phone', true)
) OR is_client_authorized(client_id));

CREATE POLICY "Clients can create property submissions"
ON public.property_agency_submissions
FOR INSERT
WITH CHECK (client_id IN (
  SELECT id FROM public.clients 
  WHERE phone = current_setting('app.current_client_phone', true)
) OR is_client_authorized(client_id));

CREATE POLICY "Agency admins can manage their submissions"
ON public.property_agency_submissions
FOR ALL
USING (agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid 
       AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text));

CREATE POLICY "Agents can view their assigned submissions"
ON public.property_agency_submissions
FOR SELECT
USING (agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
       AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text));

-- Update property_documents RLS policies for new structure
DROP POLICY IF EXISTS "Property documents follow property access" ON public.property_documents;

CREATE POLICY "Clients can access their property documents"
ON public.property_documents
FOR ALL
USING (client_property_id IN (
  SELECT id FROM public.client_properties 
  WHERE is_client_authorized(client_id)
));

CREATE POLICY "Agency staff can view submitted property documents"
ON public.property_documents
FOR SELECT
USING (client_property_id IN (
  SELECT pas.property_id 
  FROM public.property_agency_submissions pas
  WHERE pas.agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid
  AND (
    (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text) OR
    (pas.agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()) 
     AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text))
  )
));

-- 7. Create indexes for better performance on new structure
CREATE INDEX IF NOT EXISTS idx_property_documents_client_property_id 
ON public.property_documents(client_property_id);

CREATE INDEX IF NOT EXISTS idx_property_agency_submissions_property_id 
ON public.property_agency_submissions(property_id);

CREATE INDEX IF NOT EXISTS idx_property_agency_submissions_agency_id 
ON public.property_agency_submissions(agency_id);

CREATE INDEX IF NOT EXISTS idx_property_agency_submissions_agent_id 
ON public.property_agency_submissions(agent_id);

CREATE INDEX IF NOT EXISTS idx_property_agency_submissions_client_id 
ON public.property_agency_submissions(client_id);

-- 8. Add helpful comments
COMMENT ON TABLE public.client_properties IS 'Client personal property portfolio - no agency relationships here';
COMMENT ON TABLE public.property_agency_submissions IS 'Tracks which properties are submitted to which agencies/agents';
COMMENT ON TABLE public.property_documents IS 'Documents tied to client properties with proper visibility rules';
COMMENT ON COLUMN public.property_documents.client_property_id IS 'Links document to client portfolio property';
COMMENT ON COLUMN public.property_agency_submissions.is_active IS 'FALSE when property is sold/withdrawn';
COMMENT ON COLUMN public.property_agency_submissions.sold_at IS 'Timestamp when property was marked as sold';