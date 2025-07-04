-- Fix the submission notification trigger to use correct type value
CREATE OR REPLACE FUNCTION public.create_submission_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  client_name text;
  agent_name text;
  property_count integer;
BEGIN
  -- Get client and agent names
  SELECT full_name INTO client_name FROM public.clients WHERE id = NEW.client_id;
  SELECT full_name INTO agent_name FROM public.users WHERE id = NEW.agent_id;
  
  -- Get count of properties in this submission
  SELECT COUNT(*) INTO property_count FROM public.submission_properties WHERE submission_id = NEW.id;
  
  -- Create notification for agency
  INSERT INTO public.agency_notifications (
    agency_id,
    agent_id,
    client_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    NEW.agency_id,
    NEW.agent_id,
    NEW.client_id,
    'property_submitted',  -- Changed from 'property_submission' to 'property_submitted'
    'New Property Submission',
    COALESCE(client_name, 'A client') || ' has submitted ' || COALESCE(property_count, 0) || ' ' ||
    CASE WHEN property_count = 1 THEN 'property' ELSE 'properties' END ||
    CASE WHEN agent_name IS NOT NULL THEN ' via agent: ' || agent_name ELSE '' END,
    jsonb_build_object(
      'submission_id', NEW.id,
      'client_name', client_name,
      'agent_name', agent_name,
      'property_count', property_count,
      'submission_status', NEW.status
    )
  );
  
  RETURN NEW;
END;
$$;