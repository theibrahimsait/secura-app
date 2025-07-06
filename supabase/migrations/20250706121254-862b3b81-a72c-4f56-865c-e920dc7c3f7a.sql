-- Drop all existing policies on submission_updates and submission_update_attachments
DROP POLICY IF EXISTS "Agency staff can insert updates" ON public.submission_updates;
DROP POLICY IF EXISTS "Clients can insert updates" ON public.submission_updates;
DROP POLICY IF EXISTS "Agency staff can view updates" ON public.submission_updates;
DROP POLICY IF EXISTS "Clients can view updates" ON public.submission_updates;
DROP POLICY IF EXISTS "Agency staff can create attachments" ON public.submission_update_attachments;
DROP POLICY IF EXISTS "Clients can create attachments" ON public.submission_update_attachments;
DROP POLICY IF EXISTS "Agency staff can view attachments" ON public.submission_update_attachments;
DROP POLICY IF EXISTS "Clients can view attachments" ON public.submission_update_attachments;

-- Ensure RLS is enabled
ALTER TABLE public.submission_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_update_attachments ENABLE ROW LEVEL SECURITY;

-- CREATE POLICIES FOR submission_updates (agency_admin only)

-- Only agency_admin can insert messages
CREATE POLICY "Admins can create updates"
  ON public.submission_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = 'admin'
    AND submission_id IN (
      SELECT id FROM public.property_agency_submissions
      WHERE agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
    )
  );

-- Only agency_admin can read all updates
CREATE POLICY "Admins can view updates"
  ON public.submission_updates
  FOR SELECT
  TO authenticated
  USING (
    submission_id IN (
      SELECT id FROM public.property_agency_submissions
      WHERE agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
    )
  );

-- Clients can insert updates
CREATE POLICY "Clients can create updates"
  ON public.submission_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = 'client'
    AND submission_id IN (
      SELECT id FROM public.property_agency_submissions
      WHERE is_client_authorized(client_id)
    )
  );

-- Clients can view updates
CREATE POLICY "Clients can view updates"
  ON public.submission_updates
  FOR SELECT
  TO authenticated
  USING (
    submission_id IN (
      SELECT id FROM public.property_agency_submissions
      WHERE is_client_authorized(client_id)
    )
  );

-- CREATE POLICIES FOR submission_update_attachments (agency_admin only)

-- Only agency_admin can create attachments
CREATE POLICY "Admins can create attachments"
  ON public.submission_update_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    update_id IN (
      SELECT su.id
      FROM public.submission_updates su
      JOIN public.property_agency_submissions pas ON su.submission_id = pas.id
      WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
    )
  );

-- Only agency_admin can view attachments
CREATE POLICY "Admins can view attachments"
  ON public.submission_update_attachments
  FOR SELECT
  TO authenticated
  USING (
    update_id IN (
      SELECT su.id
      FROM public.submission_updates su
      JOIN public.property_agency_submissions pas ON su.submission_id = pas.id
      WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
    )
  );

-- Clients can create attachments
CREATE POLICY "Clients can create attachments"
  ON public.submission_update_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    update_id IN (
      SELECT su.id
      FROM public.submission_updates su
      JOIN public.property_agency_submissions pas ON su.submission_id = pas.id
      WHERE is_client_authorized(pas.client_id)
    )
  );

-- Clients can view attachments
CREATE POLICY "Clients can view attachments"
  ON public.submission_update_attachments
  FOR SELECT
  TO authenticated
  USING (
    update_id IN (
      SELECT su.id
      FROM public.submission_updates su
      JOIN public.property_agency_submissions pas ON su.submission_id = pas.id
      WHERE is_client_authorized(pas.client_id)
    )
  );