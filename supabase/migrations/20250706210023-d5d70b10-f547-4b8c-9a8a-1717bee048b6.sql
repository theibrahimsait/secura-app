-- Fix RLS policies for submission_updates to work with client sessions

-- First, drop the existing problematic policies
DROP POLICY IF EXISTS "Clients can create their own updates" ON submission_updates;
DROP POLICY IF EXISTS "Clients can create updates" ON submission_updates;

-- Create a new, simplified policy for client message creation
CREATE POLICY "Clients can create messages for their submissions" 
ON submission_updates 
FOR INSERT 
WITH CHECK (
  sender_role = 'client' 
  AND client_id = get_client_id_from_session()
  AND submission_id IN (
    SELECT pas.id 
    FROM property_agency_submissions pas 
    WHERE pas.client_id = get_client_id_from_session()
  )
);

-- Also update the read policy to use the consistent function
DROP POLICY IF EXISTS "Clients can view all updates in their submissions" ON submission_updates;
DROP POLICY IF EXISTS "Clients can view updates in their submissions" ON submission_updates;

CREATE POLICY "Clients can view updates in their submissions" 
ON submission_updates 
FOR SELECT 
USING (
  submission_id IN (
    SELECT pas.id 
    FROM property_agency_submissions pas 
    WHERE pas.client_id = get_client_id_from_session()
  )
);