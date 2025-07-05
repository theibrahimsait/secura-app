-- Fix trigger function that's causing the "agency_id" error
-- The create_property_notification function is trying to access NEW.agency_id 
-- but client_properties no longer has this field after schema refactor

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS create_property_notification_trigger ON public.client_properties;

-- Update the function to not reference agency_id/agent_id from client_properties
-- Since client_properties no longer has agency_id, we should only create notifications
-- when properties are actually submitted to agencies via property_agency_submissions
CREATE OR REPLACE FUNCTION public.create_property_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- This function should only be used for property_agency_submissions table now
  -- Not for client_properties table
  RETURN NEW;
END;
$$;

-- The notification creation should happen in the property_agency_submissions trigger instead
-- Let's make sure we have a proper trigger for that table
CREATE OR REPLACE FUNCTION public.create_submission_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  client_name text;
  agent_name text;
  property_title text;
  property_location text;
BEGIN
  -- Get client, agent, and property information
  SELECT full_name INTO client_name FROM public.clients WHERE id = NEW.client_id;
  SELECT full_name INTO agent_name FROM public.users WHERE id = NEW.agent_id;
  SELECT title, location INTO property_title, property_location FROM public.client_properties WHERE id = NEW.property_id;
  
  -- Create notification for agency
  INSERT INTO public.agency_notifications (
    agency_id,
    agent_id,
    client_id,
    property_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    NEW.agency_id,
    NEW.agent_id,
    NEW.client_id,
    NEW.property_id,
    'property_submitted',
    'New Property Submitted',
    COALESCE(client_name, 'A client') || ' has submitted a new property: ' || COALESCE(property_title, 'Unknown') || 
    CASE WHEN agent_name IS NOT NULL THEN ' (via agent: ' || agent_name || ')' ELSE '' END,
    jsonb_build_object(
      'property_title', property_title,
      'property_location', property_location,
      'client_name', client_name,
      'agent_name', agent_name
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for property_agency_submissions (not client_properties)
DROP TRIGGER IF EXISTS create_submission_notification_trigger ON public.property_agency_submissions;
CREATE TRIGGER create_submission_notification_trigger
  AFTER INSERT ON public.property_agency_submissions
  FOR EACH ROW EXECUTE FUNCTION public.create_submission_notification();