
-- Add new status values for the property workflow
ALTER TABLE client_properties DROP CONSTRAINT IF EXISTS client_properties_status_check;
ALTER TABLE client_properties ADD CONSTRAINT client_properties_status_check 
CHECK (status IN ('draft', 'in_portfolio', 'submitted', 'under_review', 'approved', 'rejected'));

-- Create a new table to track property submissions to different agencies
CREATE TABLE IF NOT EXISTS property_agency_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES client_properties(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, agency_id)
);

-- Enable RLS on the new table
ALTER TABLE property_agency_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for property_agency_submissions
CREATE POLICY "Clients can view their own submissions" ON property_agency_submissions
FOR SELECT USING (client_id IN (SELECT id FROM clients WHERE phone = current_setting('app.current_client_phone', true)));

CREATE POLICY "Clients can create submissions" ON property_agency_submissions
FOR INSERT WITH CHECK (client_id IN (SELECT id FROM clients WHERE phone = current_setting('app.current_client_phone', true)));

-- Update the property trigger to not automatically create notifications
-- We'll handle this in the submission flow instead
DROP TRIGGER IF EXISTS create_property_notification_trigger ON client_properties;
