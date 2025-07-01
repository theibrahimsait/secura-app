-- Create enum for property types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_type') THEN
    CREATE TYPE property_type AS ENUM ('apartment', 'villa', 'townhouse', 'penthouse', 'studio', 'office', 'retail', 'warehouse', 'land');
  END IF;
END$$;

-- Create enum for document types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM ('emirates_id', 'passport', 'visa', 'title_deed', 'power_of_attorney', 'noc', 'ejari', 'dewa_bill', 'other');
  END IF;
END$$;

-- Create enum for task status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('pending', 'action_required', 'in_progress', 'completed');
  END IF;
END$$;

-- Create enum for submission status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
    CREATE TYPE submission_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'additional_info_required');
  END IF;
END$$;

-- Update the existing clients table to include mobile number and OTP fields
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS mobile_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS otp_code TEXT,
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Make mobile_number required for new records
ALTER TABLE public.clients 
ALTER COLUMN mobile_number SET NOT NULL;

-- Create properties table for client portfolios
CREATE TABLE IF NOT EXISTS public.client_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  property_type property_type NOT NULL,
  location TEXT NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  area_sqft INTEGER,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create property documents table
CREATE TABLE IF NOT EXISTS public.property_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.client_properties(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  document_type document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create property submissions table (when clients share properties with agencies)
CREATE TABLE IF NOT EXISTS public.property_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.client_properties(id) ON DELETE CASCADE NOT NULL,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status submission_status DEFAULT 'submitted',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create agent referral links table
CREATE TABLE IF NOT EXISTS public.agent_referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  ref_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create tasks table for client task management
CREATE TABLE IF NOT EXISTS public.client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.client_properties(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'pending',
  action_required TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  property_id UUID REFERENCES public.client_properties(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.client_tasks(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.client_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_properties
DROP POLICY IF EXISTS "Clients can manage their own properties" ON public.client_properties;
CREATE POLICY "Clients can manage their own properties" ON public.client_properties
  FOR ALL USING (client_id IN (
    SELECT id FROM public.clients WHERE id = client_id
  ));

DROP POLICY IF EXISTS "Agency admins can view submitted properties" ON public.client_properties;
CREATE POLICY "Agency admins can view submitted properties" ON public.client_properties
  FOR SELECT USING (
    id IN (
      SELECT property_id FROM public.property_submissions ps
      WHERE ps.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin')
    )
  );

DROP POLICY IF EXISTS "Agents can view their referred properties" ON public.client_properties;
CREATE POLICY "Agents can view their referred properties" ON public.client_properties
  FOR SELECT USING (
    id IN (
      SELECT property_id FROM public.property_submissions ps
      WHERE ps.agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
      AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'agent')
    )
  );

-- RLS Policies for property_documents
DROP POLICY IF EXISTS "Clients can manage their property documents" ON public.property_documents;
CREATE POLICY "Clients can manage their property documents" ON public.property_documents
  FOR ALL USING (client_id IN (
    SELECT id FROM public.clients WHERE id = client_id
  ));

DROP POLICY IF EXISTS "Agency staff can view submitted property documents" ON public.property_documents;
CREATE POLICY "Agency staff can view submitted property documents" ON public.property_documents
  FOR SELECT USING (
    property_id IN (
      SELECT property_id FROM public.property_submissions ps
      WHERE ps.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
      AND (
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin') OR
        (ps.agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()) AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'agent'))
      )
    )
  );

-- RLS Policies for property_submissions
DROP POLICY IF EXISTS "Agency admins can manage submissions" ON public.property_submissions;
CREATE POLICY "Agency admins can manage submissions" ON public.property_submissions
  FOR ALL USING (
    agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin')
  );

DROP POLICY IF EXISTS "Agents can view their submissions" ON public.property_submissions;
CREATE POLICY "Agents can view their submissions" ON public.property_submissions
  FOR SELECT USING (
    agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'agent')
  );

-- RLS Policies for agent_referral_links
DROP POLICY IF EXISTS "Agents can manage their referral links" ON public.agent_referral_links;
CREATE POLICY "Agents can manage their referral links" ON public.agent_referral_links
  FOR ALL USING (
    agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'agent')
  );

DROP POLICY IF EXISTS "Agency admins can view agency referral links" ON public.agent_referral_links;
CREATE POLICY "Agency admins can view agency referral links" ON public.agent_referral_links
  FOR SELECT USING (
    agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin')
  );

-- RLS Policies for client_tasks
DROP POLICY IF EXISTS "Agency staff can manage tasks" ON public.client_tasks;
CREATE POLICY "Agency staff can manage tasks" ON public.client_tasks
  FOR ALL USING (
    agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role' = 'agency_admin') OR
      (agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()) AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'agent'))
    )
  );

-- RLS Policies for client_notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON public.client_notifications;
CREATE POLICY "Users can view their notifications" ON public.client_notifications
  FOR SELECT USING (
    (client_id IS NOT NULL) OR
    (user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Agency staff can create client notifications" ON public.client_notifications;
CREATE POLICY "Agency staff can create client notifications" ON public.client_notifications
  FOR INSERT WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('agency_admin', 'agent'))
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_properties_client_id ON public.client_properties(client_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_property_id ON public.property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_client_id ON public.property_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_property_submissions_client_id ON public.property_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_property_submissions_agency_id ON public.property_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_property_submissions_agent_id ON public.property_submissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_referral_links_token ON public.agent_referral_links(ref_token);
CREATE INDEX IF NOT EXISTS idx_client_tasks_client_id ON public.client_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_client_id ON public.client_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_user_id ON public.client_notifications(user_id);
