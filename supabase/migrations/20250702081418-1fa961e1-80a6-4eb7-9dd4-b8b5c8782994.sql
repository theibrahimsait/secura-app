-- Create submissions table
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create submission_properties join table
CREATE TABLE public.submission_properties (
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.client_properties(id) ON DELETE CASCADE,
  PRIMARY KEY (submission_id, property_id)
);

-- Enable RLS on submissions table
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on submission_properties table
ALTER TABLE public.submission_properties ENABLE ROW LEVEL SECURITY;

-- RLS policies for submissions table
CREATE POLICY "Clients can view their own submissions"
ON public.submissions
FOR SELECT
USING (client_id IN (SELECT id FROM public.clients WHERE phone = current_setting('app.current_client_phone', true)));

CREATE POLICY "Clients can create submissions"
ON public.submissions
FOR INSERT
WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE phone = current_setting('app.current_client_phone', true)));

CREATE POLICY "Agents can view their submissions"
ON public.submissions
FOR SELECT
USING (agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Agency admins can view agency submissions"
ON public.submissions
FOR ALL
USING (agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text));

-- RLS policies for submission_properties table
CREATE POLICY "Clients can view their submission properties"
ON public.submission_properties
FOR SELECT
USING (submission_id IN (SELECT id FROM public.submissions WHERE client_id IN (SELECT id FROM public.clients WHERE phone = current_setting('app.current_client_phone', true))));

CREATE POLICY "Clients can create submission properties"
ON public.submission_properties
FOR INSERT
WITH CHECK (submission_id IN (SELECT id FROM public.submissions WHERE client_id IN (SELECT id FROM public.clients WHERE phone = current_setting('app.current_client_phone', true))));

CREATE POLICY "Agents can view their submission properties"
ON public.submission_properties
FOR SELECT
USING (submission_id IN (SELECT id FROM public.submissions WHERE agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())));

CREATE POLICY "Agency admins can view agency submission properties"
ON public.submission_properties
FOR ALL
USING (submission_id IN (SELECT id FROM public.submissions WHERE agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text)));

-- Add indexes for better performance
CREATE INDEX idx_submissions_client_id ON public.submissions(client_id);
CREATE INDEX idx_submissions_agent_id ON public.submissions(agent_id);
CREATE INDEX idx_submissions_agency_id ON public.submissions(agency_id);
CREATE INDEX idx_submission_properties_submission_id ON public.submission_properties(submission_id);
CREATE INDEX idx_submission_properties_property_id ON public.submission_properties(property_id);