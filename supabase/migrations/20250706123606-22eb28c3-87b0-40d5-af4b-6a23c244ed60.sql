-- Comprehensive fix for client submission updates RLS policies

-- 1. Ensure RLS is enabled on both tables
ALTER TABLE public.submission_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_update_attachments ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing SELECT policies to start fresh
DROP POLICY IF EXISTS "Clients can view updates" ON public.submission_updates;
DROP POLICY IF EXISTS "Clients can view all updates in their submissions" ON public.submission_updates;
DROP POLICY IF EXISTS "Clients can view updates for their submissions" ON public.submission_updates;
DROP POLICY IF EXISTS "Admins can view updates" ON public.submission_updates;
DROP POLICY IF EXISTS "Agency staff can view all updates for their submissions" ON public.submission_updates;

DROP POLICY IF EXISTS "Clients can view attachments" ON public.submission_update_attachments;
DROP POLICY IF EXISTS "Clients can view all attachments in their submissions" ON public.submission_update_attachments;
DROP POLICY IF EXISTS "Clients can view attachments for their submissions" ON public.submission_update_attachments;
DROP POLICY IF EXISTS "Admins can view attachments" ON public.submission_update_attachments;
DROP POLICY IF EXISTS "Agency staff can view attachments for their submissions" ON public.submission_update_attachments;

-- 3. Create fresh, clean SELECT policies for clients
CREATE POLICY "Clients can view all updates in their submissions"
  ON public.submission_updates
  FOR SELECT
  TO authenticated
  USING (
    submission_id IN (
      SELECT pas.id
      FROM public.property_agency_submissions pas
      WHERE is_client_authorized(pas.client_id)
    )
  );

CREATE POLICY "Clients can view all attachments in their submissions"
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

-- 4. Recreate agency admin SELECT policies (they need to see updates too)
CREATE POLICY "Agency admins can view updates for their agency"
  ON public.submission_updates
  FOR SELECT
  TO authenticated
  USING (
    submission_id IN (
      SELECT pas.id
      FROM public.property_agency_submissions pas
      WHERE pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
      AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
    )
  );

CREATE POLICY "Agency admins can view attachments for their agency"
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