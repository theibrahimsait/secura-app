-- Create submission audit logs table
CREATE TABLE public.submission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.property_agency_submissions(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('client', 'agent', 'agency_admin')),
  actor_id UUID,
  action TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.submission_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Clients can view logs for their own submissions
CREATE POLICY "Clients can view their submission audit logs"
ON public.submission_audit_logs FOR SELECT
USING (
  submission_id IN (
    SELECT pas.id 
    FROM property_agency_submissions pas
    WHERE pas.client_id = get_client_id_from_session_readonly()
  )
);

-- Agency staff can view logs for their agency's submissions
CREATE POLICY "Agency staff can view submission audit logs"
ON public.submission_audit_logs FOR SELECT
USING (
  submission_id IN (
    SELECT pas.id 
    FROM property_agency_submissions pas
    WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
      OR pas.agent_id = (SELECT users.id FROM users WHERE users.auth_user_id = auth.uid())
    )
  )
);

-- Allow inserting audit logs from both client and agency contexts
CREATE POLICY "Allow audit log creation"
ON public.submission_audit_logs FOR INSERT
WITH CHECK (
  -- Client context
  (
    actor_type = 'client' 
    AND submission_id IN (
      SELECT pas.id 
      FROM property_agency_submissions pas
      WHERE pas.client_id = get_client_id_from_session_readonly()
    )
  )
  OR
  -- Agency context  
  (
    actor_type IN ('agent', 'agency_admin')
    AND submission_id IN (
      SELECT pas.id 
      FROM property_agency_submissions pas
      WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
    )
  )
);

-- Create index for better performance
CREATE INDEX idx_submission_audit_logs_submission_id ON public.submission_audit_logs(submission_id);
CREATE INDEX idx_submission_audit_logs_created_at ON public.submission_audit_logs(created_at);