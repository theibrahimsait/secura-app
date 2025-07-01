-- Fix the property notification function to handle null agency_id
CREATE OR REPLACE FUNCTION public.create_property_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  client_name text;
  agent_name text;
BEGIN
  -- Only create notification if agency_id is not null
  IF NEW.agency_id IS NOT NULL THEN
    -- Get client and agent names
    SELECT full_name INTO client_name FROM public.clients WHERE id = NEW.client_id;
    SELECT full_name INTO agent_name FROM public.users WHERE id = NEW.agent_id;
    
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
      NEW.id,
      'property_submitted',
      'New Property Submitted',
      COALESCE(client_name, 'A client') || ' has submitted a new property: ' || NEW.title || 
      CASE WHEN agent_name IS NOT NULL THEN ' (via agent: ' || agent_name || ')' ELSE '' END,
      jsonb_build_object(
        'property_title', NEW.title,
        'property_location', NEW.location,
        'client_name', client_name,
        'agent_name', agent_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#0ea5e9';
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS description text;
