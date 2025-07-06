-- Add client RLS policies for submission updates and attachments

-- 1. INSERT policy for clients on submission_updates
CREATE POLICY "Clients can create their own updates"
  ON public.submission_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = 'client'
    AND client_id = get_client_id_from_session_readonly()
    AND submission_id IN (
      SELECT pas.id
      FROM public.property_agency_submissions pas
      WHERE pas.client_id = get_client_id_from_session_readonly()
    )
  );

-- 2. SELECT policy for clients on submission_updates  
CREATE POLICY "Clients can view updates in their submissions"
  ON public.submission_updates
  FOR SELECT
  TO authenticated
  USING (
    submission_id IN (
      SELECT pas.id
      FROM public.property_agency_submissions pas
      WHERE pas.client_id = get_client_id_from_session_readonly()
    )
  );

-- 3. INSERT policy for clients on submission_update_attachments
CREATE POLICY "Clients can create attachments for their updates"
  ON public.submission_update_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    update_id IN (
      SELECT su.id
      FROM public.submission_updates su
      JOIN public.property_agency_submissions pas ON su.submission_id = pas.id
      WHERE pas.client_id = get_client_id_from_session_readonly()
    )
  );

-- 4. SELECT policy for clients on submission_update_attachments
CREATE POLICY "Clients can view attachments in their submissions"
  ON public.submission_update_attachments
  FOR SELECT
  TO authenticated
  USING (
    update_id IN (
      SELECT su.id
      FROM public.submission_updates su
      JOIN public.property_agency_submissions pas ON su.submission_id = pas.id
      WHERE pas.client_id = get_client_id_from_session_readonly()
    )
  );