-- Allow null property_id for ID document submissions
ALTER TABLE property_agency_submissions 
ALTER COLUMN property_id DROP NOT NULL;

-- Update the notes column to be longer for additional information
ALTER TABLE property_agency_submissions 
ALTER COLUMN notes TYPE text;