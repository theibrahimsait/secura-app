-- Fix RLS policies for submissions table to allow client property submissions

-- Drop existing restrictive policies for submissions
DROP POLICY IF EXISTS "Clients can create submissions" ON public.submissions;
DROP POLICY IF EXISTS "Clients can view their own submissions" ON public.submissions;

-- Create new policies that work with client authentication
-- Allow clients to create submissions for their own properties
CREATE POLICY "Clients can create their own submissions"
ON public.submissions
FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE phone = ((current_setting('request.jwt.claims', true))::json ->> 'phone')
  )
);

-- Allow clients to view their own submissions
CREATE POLICY "Clients can view their own submissions"
ON public.submissions
FOR SELECT
USING (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE phone = ((current_setting('request.jwt.claims', true))::json ->> 'phone')
  )
);

-- Also update submission_properties policies to match
DROP POLICY IF EXISTS "Clients can create submission properties" ON public.submission_properties;
DROP POLICY IF EXISTS "Clients can view their submission properties" ON public.submission_properties;

-- Allow clients to create submission properties for their own submissions
CREATE POLICY "Clients can create their submission properties"
ON public.submission_properties
FOR INSERT
WITH CHECK (
  submission_id IN (
    SELECT s.id FROM public.submissions s
    JOIN public.clients c ON s.client_id = c.id
    WHERE c.phone = ((current_setting('request.jwt.claims', true))::json ->> 'phone')
  )
);

-- Allow clients to view their submission properties
CREATE POLICY "Clients can view their submission properties"
ON public.submission_properties
FOR SELECT
USING (
  submission_id IN (
    SELECT s.id FROM public.submissions s
    JOIN public.clients c ON s.client_id = c.id
    WHERE c.phone = ((current_setting('request.jwt.claims', true))::json ->> 'phone')
  )
);