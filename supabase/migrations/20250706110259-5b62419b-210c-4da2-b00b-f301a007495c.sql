-- Create submission updates system for 2-way communication

-- Table for submission updates/messages
CREATE TABLE public.submission_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'agent', 'client')),
  sender_id UUID,
  client_id UUID,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Foreign key to property_agency_submissions
  CONSTRAINT fk_submission_updates_submission 
    FOREIGN KEY (submission_id) 
    REFERENCES public.property_agency_submissions(id) 
    ON DELETE CASCADE,
    
  -- Foreign key to users for admin/agent senders
  CONSTRAINT fk_submission_updates_sender
    FOREIGN KEY (sender_id)
    REFERENCES public.users(id)
    ON DELETE SET NULL,
    
  -- Foreign key to clients for client senders  
  CONSTRAINT fk_submission_updates_client
    FOREIGN KEY (client_id)
    REFERENCES public.clients(id)
    ON DELETE CASCADE,
    
  -- Ensure either sender_id (admin/agent) or client_id is set
  CONSTRAINT check_sender_exists
    CHECK (
      (sender_role IN ('admin', 'agent') AND sender_id IS NOT NULL AND client_id IS NULL) OR
      (sender_role = 'client' AND client_id IS NOT NULL AND sender_id IS NULL)
    )
);

-- Table for file attachments to updates
CREATE TABLE public.submission_update_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_update_attachments_update
    FOREIGN KEY (update_id)
    REFERENCES public.submission_updates(id)
    ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.submission_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_update_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for submission_updates
CREATE POLICY "Agency staff can view all updates for their submissions"
ON public.submission_updates
FOR SELECT
USING (
  submission_id IN (
    SELECT pas.id 
    FROM property_agency_submissions pas
    WHERE pas.agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid
    AND (
      (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text) OR
      (pas.agent_id = (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid()) 
       AND ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)
    )
  )
);

CREATE POLICY "Agency staff can create updates for their submissions"
ON public.submission_updates
FOR INSERT
WITH CHECK (
  submission_id IN (
    SELECT pas.id 
    FROM property_agency_submissions pas
    WHERE pas.agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid
    AND (
      (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text) OR
      (pas.agent_id = (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid()) 
       AND ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)
    )
  )
  AND sender_role IN ('admin', 'agent')
  AND sender_id = (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid())
);

CREATE POLICY "Clients can view updates for their submissions"
ON public.submission_updates
FOR SELECT
USING (
  submission_id IN (
    SELECT pas.id 
    FROM property_agency_submissions pas
    WHERE is_client_authorized(pas.client_id)
  )
);

CREATE POLICY "Clients can create updates for their submissions"
ON public.submission_updates
FOR INSERT
WITH CHECK (
  submission_id IN (
    SELECT pas.id 
    FROM property_agency_submissions pas
    WHERE is_client_authorized(pas.client_id)
  )
  AND sender_role = 'client'
  AND is_client_authorized(client_id)
);

-- RLS policies for submission_update_attachments
CREATE POLICY "Agency staff can view attachments for their submissions"
ON public.submission_update_attachments
FOR SELECT
USING (
  update_id IN (
    SELECT su.id 
    FROM submission_updates su
    JOIN property_agency_submissions pas ON su.submission_id = pas.id
    WHERE pas.agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid
    AND (
      (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text) OR
      (pas.agent_id = (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid()) 
       AND ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)
    )
  )
);

CREATE POLICY "Agency staff can create attachments for their updates"
ON public.submission_update_attachments
FOR INSERT
WITH CHECK (
  update_id IN (
    SELECT su.id 
    FROM submission_updates su
    JOIN property_agency_submissions pas ON su.submission_id = pas.id
    WHERE pas.agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid
    AND (
      (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text) OR
      (pas.agent_id = (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid()) 
       AND ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)
    )
  )
);

CREATE POLICY "Clients can view attachments for their submissions"
ON public.submission_update_attachments
FOR SELECT
USING (
  update_id IN (
    SELECT su.id 
    FROM submission_updates su
    JOIN property_agency_submissions pas ON su.submission_id = pas.id
    WHERE is_client_authorized(pas.client_id)
  )
);

CREATE POLICY "Clients can create attachments for their updates"
ON public.submission_update_attachments
FOR INSERT
WITH CHECK (
  update_id IN (
    SELECT su.id 
    FROM submission_updates su
    JOIN property_agency_submissions pas ON su.submission_id = pas.id
    WHERE is_client_authorized(pas.client_id)
  )
);

-- Create indexes for performance
CREATE INDEX idx_submission_updates_submission_id ON public.submission_updates(submission_id);
CREATE INDEX idx_submission_updates_created_at ON public.submission_updates(created_at);
CREATE INDEX idx_submission_update_attachments_update_id ON public.submission_update_attachments(update_id);