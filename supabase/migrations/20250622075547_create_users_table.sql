
-- Create custom types for user roles
CREATE TYPE public.user_role AS ENUM ('superadmin', 'agency_admin', 'agent', 'client');
CREATE TYPE public.client_type AS ENUM ('buy', 'sell', 'rent');
CREATE TYPE public.audit_action AS ENUM ('login', 'logout', 'view', 'download', 'upload', 'create', 'update', 'delete');

-- Create agencies table
CREATE TABLE public.agencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create users table (separate from auth.users for our custom logic)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client links table (for agent-generated links)
CREATE TABLE public.client_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_token TEXT UNIQUE NOT NULL,
  agent_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  client_phone TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_type client_type NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  property_type TEXT NOT NULL,
  location TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  document_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit trail table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  client_id UUID REFERENCES public.clients(id),
  action audit_action NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert superadmin user (hardcoded)
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@secura.com',
  'Super Admin',
  'superadmin',
  true
);

-- Enable Row Level Security
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agencies
CREATE POLICY "Superadmin can view all agencies" ON public.agencies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Agency admin can view own agency" ON public.agencies
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT agency_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'agency_admin'
    )
  );

-- RLS Policies for users
CREATE POLICY "Superadmin can view all users" ON public.users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Agency admin can view agency users" ON public.users
  FOR SELECT TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'agency_admin'
    )
  );

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- RLS Policies for audit logs
CREATE POLICY "Superadmin can view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Agency admin can view agency audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT u1.id FROM public.users u1
      JOIN public.users u2 ON u1.agency_id = u2.agency_id
      WHERE u2.auth_user_id = auth.uid() AND u2.role = 'agency_admin'
    )
  );

-- Create function to handle user creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create user record if it doesn't exist and email matches our users table
  IF EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email AND auth_user_id IS NULL) THEN
    UPDATE public.users 
    SET auth_user_id = NEW.id, updated_at = now()
    WHERE email = NEW.email AND auth_user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_client_id UUID,
  p_action audit_action,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id, client_id, action, resource_type, resource_id, 
    details, ip_address, user_agent
  ) VALUES (
    p_user_id, p_client_id, p_action, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;
