-- Clean up ALL existing policies on submission_updates
DROP POLICY IF EXISTS "Agency staff can create updates" ON public.submission_updates;
DROP POLICY IF EXISTS "Agency staff can create updates for their submissions" ON public.submission_updates;
DROP POLICY IF EXISTS "Clients can create updates" ON public.submission_updates;
DROP POLICY IF EXISTS "Clients can create updates for their submissions" ON public.submission_updates;
DROP POLICY IF EXISTS "Agency staff can view updates" ON public.submission_updates;
DROP POLICY IF EXISTS "Agency staff can view all updates for their submissions" ON public.submission_updates;
DROP POLICY IF EXISTS "Clients can view updates" ON public.submission_updates;
DROP POLICY IF EXISTS "Clients can view updates for their submissions" ON public.submission_updates;

-- Clean up ALL existing policies on submission_update_attachments
DROP POLICY IF EXISTS "Agency staff can create attachments for their updates" ON public.submission_update_attachments;
DROP POLICY IF EXISTS "Clients can create attachments for their updates" ON public.submission_update_attachments;
DROP POLICY IF EXISTS "Agency staff can view attachments" ON public.submission_update_attachments;
DROP POLICY IF EXISTS "Agency staff can view attachments for their submissions" ON public.submission_update_attachments;
DROP POLICY IF EXISTS "Clients can view attachments" ON public.submission_update_attachments;
DROP POLICY IF EXISTS "Clients can view attachments for their submissions" ON public.submission_update_attachments;

-- Ensure RLS is enabled
ALTER TABLE public.submission_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_update_attachments ENABLE ROW LEVEL SECURITY;

-- CREATE CLEAN POLICIES FOR submission_updates
-- Agency staff INSERT policy
CREATE POLICY "Agency staff can create updates"
  ON public.submission_updates
  FOR INSERT
  WITH CHECK (
    sender_role IN ('admin', 'agent')
    AND submission_id IN (
      SELECT pas.id
      FROM public.property_agency_submissions pas
      WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
        AND (
          (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
          OR pas.agent_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid())
        )
    )
  );

-- Client INSERT policy
CREATE POLICY "Clients can create updates"
  ON public.submission_updates
  FOR INSERT
  WITH CHECK (
    sender_role = 'client'
    AND submission_id IN (
      SELECT pas.id
      FROM public.property_agency_submissions pas
      WHERE is_client_authorized(pas.client_id)
    )
  );

-- Agency staff SELECT policy
CREATE POLICY "Agency staff can view updates"
  ON public.submission_updates
  FOR SELECT
  USING (
    submission_id IN (
      SELECT pas.id
      FROM public.property_agency_submissions pas
      WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
        AND (
          (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
          OR pas.agent_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid())
        )
    )
  );

-- Client SELECT policy
CREATE POLICY "Clients can view updates"
  ON public.submission_updates
  FOR SELECT
  USING (
    submission_id IN (
      SELECT pas.id
      FROM public.property_agency_submissions pas
      WHERE is_client_authorized(pas.client_id)
    )
  );

-- CREATE CLEAN POLICIES FOR submission_update_attachments
-- Agency staff INSERT policy
CREATE POLICY "Agency staff can create attachments"
  ON public.submission_update_attachments
  FOR INSERT
  WITH CHECK (
    update_id IN (
      SELECT su.id
      FROM public.submission_updates su
      JOIN public.property_agency_submissions pas ON su.submission_id = pas.id
      WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
        AND (
          (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
          OR pas.agent_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid())
        )
    )
  );

-- Client INSERT policy for attachments
CREATE POLICY "Clients can create attachments"
  ON public.submission_update_attachments
  FOR INSERT
  WITH CHECK (
    update_id IN (
      SELECT su.id
      FROM public.submission_updates su
      JOIN public.property_agency_submissions pas ON su.submission_id = pas.id
      WHERE is_client_authorized(pas.client_id)
    )
  );

-- Agency staff SELECT policy for attachments
CREATE POLICY "Agency staff can view attachments"
  ON public.submission_update_attachments
  FOR SELECT
  USING (
    update_id IN (
      SELECT su.id
      FROM public.submission_updates su
      JOIN public.property_agency_submissions pas ON su.submission_id = pas.id
      WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
        AND (
          (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
          OR pas.agent_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid())
        )
    )
  );

-- Client SELECT policy for attachments
CREATE POLICY "Clients can view attachments"
  ON public.submission_update_attachments
  FOR SELECT
  USING (
    update_id IN (
      SELECT su.id
      FROM public.submission_updates su
      JOIN public.property_agency_submissions pas ON su.submission_id = pas.id
      WHERE is_client_authorized(pas.client_id)
    )
  );