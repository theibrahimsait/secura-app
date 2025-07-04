-- Delete all data associated with client Bigger Naggot (ID: d1552e2d-5bf9-4fe1-9666-ab5572488f87)

-- Delete property documents for this client's properties
DELETE FROM property_documents 
WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';

-- Delete client documents
DELETE FROM client_documents 
WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';

-- Delete submission properties linked to this client's submissions
DELETE FROM submission_properties 
WHERE submission_id IN (
  SELECT id FROM submissions WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87'
);

-- Delete submissions
DELETE FROM submissions 
WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';

-- Delete property submissions
DELETE FROM property_submissions 
WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';

-- Delete property agency submissions
DELETE FROM property_agency_submissions 
WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';

-- Delete client properties
DELETE FROM client_properties 
WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';

-- Delete client sessions
DELETE FROM client_sessions 
WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';

-- Delete client notifications
DELETE FROM client_notifications 
WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';

-- Delete client tasks
DELETE FROM client_tasks 
WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';

-- Delete agency notifications related to this client
DELETE FROM agency_notifications 
WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';

-- Delete audit logs for this client
DELETE FROM audit_logs 
WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';

-- Update agent referral links that point to this client
UPDATE agent_referral_links 
SET client_id = NULL 
WHERE client_id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';

-- Finally, delete the client record
DELETE FROM clients 
WHERE id = 'd1552e2d-5bf9-4fe1-9666-ab5572488f87';