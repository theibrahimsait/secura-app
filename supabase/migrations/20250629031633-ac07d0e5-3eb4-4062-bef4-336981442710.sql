
-- Enable RLS on agent_referral_links table
ALTER TABLE public.agent_referral_links ENABLE ROW LEVEL SECURITY;

-- Create policy for agents to manage their own referral links
CREATE POLICY "Agents can manage own referral links" 
  ON public.agent_referral_links 
  FOR ALL 
  TO authenticated 
  USING (agent_id = auth.uid()::uuid);

-- Add columns to clients table to track onboarding and agency relationship
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.users(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referral_token text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Update agent_referral_links when used
CREATE OR REPLACE FUNCTION public.update_referral_link_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update the referral link's last_used_at timestamp
  UPDATE public.agent_referral_links 
  SET last_used_at = now()
  WHERE ref_token = NEW.referral_token;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update referral link usage (drop first if exists)
DROP TRIGGER IF EXISTS update_referral_usage ON public.clients;
CREATE TRIGGER update_referral_usage
  AFTER INSERT ON public.clients
  FOR EACH ROW 
  WHEN (NEW.referral_token IS NOT NULL)
  EXECUTE FUNCTION public.update_referral_link_usage();

-- Create client_documents table for ID documents
CREATE TABLE IF NOT EXISTS public.client_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('passport', 'national_id', 'driver_license', 'visa')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now(),
  is_verified boolean DEFAULT false,
  verified_at timestamp with time zone,
  verified_by uuid REFERENCES public.users(id)
);

-- Enable RLS on client_documents
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for client_documents (drop first if exists)
DROP POLICY IF EXISTS "Clients can manage own documents" ON public.client_documents;
CREATE POLICY "Clients can manage own documents" 
  ON public.client_documents 
  FOR ALL 
  TO public 
  USING (client_id IN (
    SELECT id FROM public.clients WHERE phone = current_setting('request.jwt.claims', true)::json->>'phone'
  ));

DROP POLICY IF EXISTS "Agents and admins can view client documents" ON public.client_documents;
CREATE POLICY "Agents and admins can view client documents" 
  ON public.client_documents 
  FOR SELECT 
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

-- Add agent_id and agency_id to client_properties for proper tracking
ALTER TABLE public.client_properties ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.users(id);
ALTER TABLE public.client_properties ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
ALTER TABLE public.client_properties ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE public.client_properties ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

-- Add check constraint for status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'client_properties_status_check'
  ) THEN
    ALTER TABLE public.client_properties 
    ADD CONSTRAINT client_properties_status_check 
    CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected'));
  END IF;
END $$;

-- Update client_properties when created to inherit agent/agency from client
CREATE OR REPLACE FUNCTION public.inherit_client_agency_info()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Set agent_id and agency_id from the client record
  SELECT agent_id, agency_id 
  INTO NEW.agent_id, NEW.agency_id
  FROM public.clients 
  WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to inherit agency info (drop first if exists)
DROP TRIGGER IF EXISTS inherit_agency_info ON public.client_properties;
CREATE TRIGGER inherit_agency_info
  BEFORE INSERT ON public.client_properties
  FOR EACH ROW 
  EXECUTE FUNCTION public.inherit_client_agency_info();

-- Enable RLS on client_properties
ALTER TABLE public.client_properties ENABLE ROW LEVEL SECURITY;

-- Create policies for client_properties (drop first if exists)
DROP POLICY IF EXISTS "Clients can manage own properties" ON public.client_properties;
CREATE POLICY "Clients can manage own properties" 
  ON public.client_properties 
  FOR ALL 
  TO public 
  USING (client_id IN (
    SELECT id FROM public.clients WHERE phone = current_setting('request.jwt.claims', true)::json->>'phone'
  ));

DROP POLICY IF EXISTS "Agents can view their clients' properties" ON public.client_properties;
CREATE POLICY "Agents can view their clients' properties" 
  ON public.client_properties 
  FOR SELECT 
  TO authenticated 
  USING (agent_id = auth.uid()::uuid);

DROP POLICY IF EXISTS "Agency admins can view agency properties" ON public.client_properties;
CREATE POLICY "Agency admins can view agency properties" 
  ON public.client_properties 
  FOR SELECT 
  TO authenticated 
  USING (
    agency_id IN (
      SELECT u.agency_id FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
  );

-- Enable RLS on existing property_documents table
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for property_documents (drop first if exists)
DROP POLICY IF EXISTS "Property documents follow property access" ON public.property_documents;
CREATE POLICY "Property documents follow property access" 
  ON public.property_documents 
  FOR ALL 
  TO public 
  USING (
    property_id IN (
      SELECT id FROM public.client_properties 
      WHERE client_id IN (
        SELECT id FROM public.clients WHERE phone = current_setting('request.jwt.claims', true)::json->>'phone'
      )
    )
  );

DROP POLICY IF EXISTS "Agents can view property documents" ON public.property_documents;
CREATE POLICY "Agents can view property documents" 
  ON public.property_documents 
  FOR SELECT 
  TO authenticated 
  USING (
    property_id IN (
      SELECT id FROM public.client_properties WHERE agent_id = auth.uid()::uuid
    )
  );

DROP POLICY IF EXISTS "Agency admins can view property documents" ON public.property_documents;
CREATE POLICY "Agency admins can view property documents" 
  ON public.property_documents 
  FOR SELECT 
  TO authenticated 
  USING (
    property_id IN (
      SELECT id FROM public.client_properties 
      WHERE agency_id IN (
        SELECT u.agency_id FROM public.users u WHERE u.auth_user_id = auth.uid()
      )
    )
  );
