-- Update the submission notification function to differentiate between property and buyer submissions
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
  notification_type text;
  notification_title text;
  notification_message text;
BEGIN
  -- Get client, agent, and property information
  SELECT full_name INTO client_name FROM public.clients WHERE id = NEW.client_id;
  SELECT full_name INTO agent_name FROM public.users WHERE id = NEW.agent_id;
  
  -- Check if this is a buyer submission (property_id is null) or property submission
  IF NEW.property_id IS NULL THEN
    -- This is a buyer (ID document) submission
    notification_type := 'buyer_registered';
    notification_title := 'New Buyer Registration';
    notification_message := COALESCE(client_name, 'A client') || ' has submitted their ID documents for buyer registration' ||
                           CASE WHEN agent_name IS NOT NULL THEN ' (via agent: ' || agent_name || ')' ELSE '' END;
  ELSE
    -- This is a property submission
    SELECT title, location INTO property_title, property_location FROM public.client_properties WHERE id = NEW.property_id;
    notification_type := 'property_submitted';
    notification_title := 'New Property Submitted';
    notification_message := COALESCE(client_name, 'A client') || ' has submitted a new property: ' || COALESCE(property_title, 'Unknown') || 
                           CASE WHEN agent_name IS NOT NULL THEN ' (via agent: ' || agent_name || ')' ELSE '' END;
  END IF;
  
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
    notification_type,
    notification_title,
    notification_message,
    jsonb_build_object(
      'property_title', property_title,
      'property_location', property_location,
      'client_name', client_name,
      'agent_name', agent_name,
      'submission_type', CASE WHEN NEW.property_id IS NULL THEN 'buyer' ELSE 'property' END
    )
  );
  
  RETURN NEW;
END;
$$;