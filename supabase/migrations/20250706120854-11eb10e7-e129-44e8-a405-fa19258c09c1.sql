-- Drop all existing INSERT policies on submission_updates to start clean
DROP POLICY IF EXISTS "Agency staff can create updates" ON public.submission_updates;
DROP POLICY IF EXISTS "Clients can create updates" ON public.submission_updates;
DROP POLICY IF EXISTS "Agency staff can create updates for their submissions" ON public.submission_updates;
DROP POLICY IF EXISTS "Clients can create updates for their submissions" ON public.submission_updates;

-- Ensure RLS is enabled
ALTER TABLE public.submission_updates ENABLE ROW LEVEL SECURITY;

-- Create exactly two INSERT policies scoped to authenticated role

-- 1. Agency staff INSERT policy
CREATE POLICY "Agency staff can insert updates"
  ON public.submission_updates
  FOR INSERT
  TO authenticated
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

-- 2. Client INSERT policy
CREATE POLICY "Clients can insert updates"
  ON public.submission_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = 'client'
    AND submission_id IN (
      SELECT pas.id
      FROM public.property_agency_submissions pas
      WHERE is_client_authorized(pas.client_id)
    )
  );