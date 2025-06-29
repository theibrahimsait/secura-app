
-- First, let's add a column to track which referral link was used by a client
ALTER TABLE public.clients ADD COLUMN referral_link_id uuid REFERENCES public.agent_referral_links(id);

-- Add a trigger to automatically set agent_id and agency_id when a client uses a referral link
CREATE OR REPLACE FUNCTION public.set_client_agent_from_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- If a referral_token is provided, find the corresponding link and set agent/agency
  IF NEW.referral_token IS NOT NULL THEN
    UPDATE public.clients 
    SET 
      agent_id = (SELECT agent_id FROM public.agent_referral_links WHERE ref_token = NEW.referral_token),
      agency_id = (SELECT agency_id FROM public.agent_referral_links WHERE ref_token = NEW.referral_token),
      referral_link_id = (SELECT id FROM public.agent_referral_links WHERE ref_token = NEW.referral_token)
    WHERE id = NEW.id;
    
    -- Update the referral link usage
    UPDATE public.agent_referral_links 
    SET last_used_at = now() 
    WHERE ref_token = NEW.referral_token;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_client_referral_set ON public.clients;
CREATE TRIGGER on_client_referral_set
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_client_agent_from_referral();

-- Add a column to track client registration on referral links
ALTER TABLE public.agent_referral_links ADD COLUMN client_id uuid REFERENCES public.clients(id);

-- Create a function to update the referral link with client info after registration
CREATE OR REPLACE FUNCTION public.update_referral_link_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Update the referral link with the client ID if they used a referral token
  IF NEW.referral_token IS NOT NULL THEN
    UPDATE public.agent_referral_links 
    SET client_id = NEW.id
    WHERE ref_token = NEW.referral_token;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for updating referral link with client info
DROP TRIGGER IF EXISTS on_client_registered ON public.clients;
CREATE TRIGGER on_client_registered
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  WHEN (OLD.is_verified = false AND NEW.is_verified = true)
  EXECUTE FUNCTION public.update_referral_link_client();

-- Add agency branding info to make links more professional
ALTER TABLE public.agencies ADD COLUMN logo_url text;
ALTER TABLE public.agencies ADD COLUMN primary_color text DEFAULT '#0ea5e9';
ALTER TABLE public.agencies ADD COLUMN description text;

-- Add a notification system for agencies
CREATE TABLE public.agency_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.client_properties(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('property_submitted', 'client_registered', 'document_uploaded', 'task_completed')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone
);

-- Enable RLS on notifications
ALTER TABLE public.agency_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for agency admins to see their notifications
CREATE POLICY "Agency admins can view their notifications"
ON public.agency_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth.uid() = auth_user_id 
    AND role = 'agency_admin' 
    AND agency_id = agency_notifications.agency_id
  )
);

-- Create a function to create notifications when properties are submitted
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
  
  RETURN NEW;
END;
$function$;

-- Create trigger for property notifications
DROP TRIGGER IF EXISTS on_property_submitted ON public.client_properties;
CREATE TRIGGER on_property_submitted
  AFTER INSERT ON public.client_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.create_property_notification();
