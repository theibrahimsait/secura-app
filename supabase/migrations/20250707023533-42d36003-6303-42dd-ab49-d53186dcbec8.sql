-- Fix RLS policy for client attachment uploads
-- The issue is that clients can't create attachment records due to RLS policy mismatch

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Clients can create attachments for their updates" ON submission_update_attachments;
DROP POLICY IF EXISTS "Clients can create attachments" ON submission_update_attachments;

-- Create a proper client attachment creation policy
CREATE POLICY "Clients can create submission update attachments"
ON submission_update_attachments FOR INSERT
WITH CHECK (
  update_id IN (
    SELECT su.id
    FROM submission_updates su
    JOIN property_agency_submissions pas ON su.submission_id = pas.id
    WHERE pas.client_id = get_client_id_from_session_readonly()
    AND su.sender_role = 'client'
  )
);