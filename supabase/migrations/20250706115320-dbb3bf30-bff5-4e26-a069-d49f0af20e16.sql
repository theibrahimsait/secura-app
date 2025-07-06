-- Enable RLS on tables (if not already enabled)
ALTER TABLE public.submission_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_update_attachments ENABLE ROW LEVEL SECURITY;

-- Add SELECT policies for submission_updates
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

-- Add SELECT policies for submission_update_attachments
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

-- Storage policies for submission-updates bucket
CREATE POLICY "Agency staff can view submission update files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'submission-updates'
    AND name ~ '^submissions/[^/]+/updates/'
    AND (
      -- Extract submission_id from path and check if user has access
      EXISTS (
        SELECT 1
        FROM public.property_agency_submissions pas
        WHERE pas.id::text = split_part(name, '/', 2)
          AND pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
          AND (
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
            OR pas.agent_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid())
          )
      )
    )
  );

CREATE POLICY "Clients can view their submission update files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'submission-updates'
    AND name ~ '^submissions/[^/]+/updates/'
    AND (
      -- Extract submission_id from path and check if client has access
      EXISTS (
        SELECT 1
        FROM public.property_agency_submissions pas
        WHERE pas.id::text = split_part(name, '/', 2)
          AND is_client_authorized(pas.client_id)
      )
    )
  );

CREATE POLICY "Agency staff can upload submission update files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'submission-updates'
    AND name ~ '^submissions/[^/]+/updates/'
    AND (
      -- Extract submission_id from path and check if user has access
      EXISTS (
        SELECT 1
        FROM public.property_agency_submissions pas
        WHERE pas.id::text = split_part(name, '/', 2)
          AND pas.agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid
          AND (
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'
            OR pas.agent_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid())
          )
      )
    )
  );

CREATE POLICY "Clients can upload their submission update files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'submission-updates'
    AND name ~ '^submissions/[^/]+/updates/'
    AND (
      -- Extract submission_id from path and check if client has access
      EXISTS (
        SELECT 1
        FROM public.property_agency_submissions pas
        WHERE pas.id::text = split_part(name, '/', 2)
          AND is_client_authorized(pas.client_id)
      )
    )
  );