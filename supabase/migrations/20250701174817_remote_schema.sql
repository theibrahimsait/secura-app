create type "public"."document_type" as enum ('emirates_id', 'passport', 'visa', 'title_deed', 'power_of_attorney', 'noc', 'ejari', 'dewa_bill', 'other');

create type "public"."property_type" as enum ('apartment', 'villa', 'townhouse', 'penthouse', 'studio', 'office', 'retail', 'warehouse', 'land');

create type "public"."submission_status" as enum ('submitted', 'under_review', 'approved', 'rejected', 'additional_info_required');

create type "public"."task_status" as enum ('pending', 'action_required', 'in_progress', 'completed');

drop trigger if exists "on_user_updated_trigger" on "public"."users";

drop policy "Users can view their own agency" on "public"."agencies";

drop policy "Admins can manage users based on JWT role" on "public"."users";

drop policy "Users can view their own profile" on "public"."users";

drop policy "Admins can manage agencies based on JWT role" on "public"."agencies";

-- drop type "public"."audit_action__old_version_to_be_dropped";

-- create type "public"."audit_action" as enum ('login', 'logout', 'view', 'download', 'upload', 'create', 'update', 'delete', 'sms_sent');

create table "public"."agency_notifications" (
    "id" uuid not null default gen_random_uuid(),
    "agency_id" uuid not null,
    "agent_id" uuid,
    "client_id" uuid,
    "property_id" uuid,
    "type" text not null,
    "title" text not null,
    "message" text not null,
    "is_read" boolean default false,
    "metadata" jsonb,
    "created_at" timestamp with time zone default now(),
    "read_at" timestamp with time zone
);


alter table "public"."agency_notifications" enable row level security;

create table "public"."agent_referral_links" (
    "id" uuid not null default gen_random_uuid(),
    "agent_id" uuid not null,
    "agency_id" uuid not null,
    "ref_token" text not null default encode(gen_random_bytes(16), 'hex'::text),
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "last_used_at" timestamp with time zone,
    "client_id" uuid
);


alter table "public"."agent_referral_links" enable row level security;

create table "public"."client_documents" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid not null,
    "document_type" text not null,
    "file_name" text not null,
    "file_path" text not null,
    "file_size" integer not null,
    "mime_type" text not null,
    "uploaded_at" timestamp with time zone default now(),
    "is_verified" boolean default false,
    "verified_at" timestamp with time zone,
    "verified_by" uuid
);


alter table "public"."client_documents" enable row level security;

create table "public"."client_notifications" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid,
    "user_id" uuid,
    "type" text not null,
    "title" text not null,
    "message" text not null,
    "property_id" uuid,
    "task_id" uuid,
    "is_read" boolean default false,
    "created_at" timestamp with time zone default now()
);


alter table "public"."client_notifications" enable row level security;

create table "public"."client_properties" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid not null,
    "title" text not null,
    "property_type" property_type not null,
    "location" text not null,
    "bedrooms" integer,
    "bathrooms" integer,
    "area_sqft" integer,
    "details" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "agent_id" uuid,
    "agency_id" uuid,
    "status" text default 'draft'::text,
    "submitted_at" timestamp with time zone
);


alter table "public"."client_properties" enable row level security;

create table "public"."client_tasks" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid not null,
    "property_id" uuid,
    "agency_id" uuid not null,
    "agent_id" uuid,
    "created_by" uuid not null,
    "title" text not null,
    "description" text,
    "status" task_status default 'pending'::task_status,
    "action_required" text,
    "due_date" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."client_tasks" enable row level security;

create table "public"."property_agency_submissions" (
    "id" uuid not null default gen_random_uuid(),
    "property_id" uuid not null,
    "client_id" uuid not null,
    "agency_id" uuid not null,
    "agent_id" uuid,
    "status" text not null default 'submitted'::text,
    "submitted_at" timestamp with time zone not null default now(),
    "reviewed_at" timestamp with time zone,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."property_agency_submissions" enable row level security;

create table "public"."property_documents" (
    "id" uuid not null default gen_random_uuid(),
    "property_id" uuid not null,
    "client_id" uuid not null,
    "document_type" document_type not null,
    "file_name" text not null,
    "file_path" text not null,
    "file_size" integer not null,
    "mime_type" text not null,
    "uploaded_at" timestamp with time zone default now()
);


alter table "public"."property_documents" enable row level security;

create table "public"."property_submissions" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid not null,
    "property_id" uuid not null,
    "agency_id" uuid not null,
    "agent_id" uuid,
    "status" submission_status default 'submitted'::submission_status,
    "submitted_at" timestamp with time zone default now(),
    "reviewed_at" timestamp with time zone,
    "notes" text
);


alter table "public"."property_submissions" enable row level security;

alter table "public"."audit_logs" alter column action type "public"."audit_action" using action::text::"public"."audit_action";

-- drop type "public"."audit_action__old_version_to_be_dropped";

alter table "public"."agencies" add column "description" text;

alter table "public"."agencies" add column "logo_url" text;

alter table "public"."agencies" add column "primary_color" text default '#0ea5e9'::text;

alter table "public"."clients" add column "agency_id" uuid;

alter table "public"."clients" add column "agent_id" uuid;

alter table "public"."clients" add column "is_verified" boolean default false;

alter table "public"."clients" add column "last_login" timestamp with time zone;

alter table "public"."clients" add column "mobile_number" text not null;

alter table "public"."clients" add column "onboarding_completed" boolean default false;

alter table "public"."clients" add column "otp_code" text;

alter table "public"."clients" add column "otp_expires_at" timestamp with time zone;

alter table "public"."clients" add column "profile_completed" boolean default false;

alter table "public"."clients" add column "referral_link_id" uuid;

alter table "public"."clients" add column "referral_token" text;

alter table "public"."clients" add column "terms_accepted_at" timestamp with time zone;

CREATE UNIQUE INDEX agency_notifications_pkey ON public.agency_notifications USING btree (id);

CREATE UNIQUE INDEX agent_referral_links_pkey ON public.agent_referral_links USING btree (id);

CREATE UNIQUE INDEX agent_referral_links_ref_token_key ON public.agent_referral_links USING btree (ref_token);

CREATE UNIQUE INDEX client_documents_pkey ON public.client_documents USING btree (id);

CREATE UNIQUE INDEX client_notifications_pkey ON public.client_notifications USING btree (id);

CREATE UNIQUE INDEX client_properties_pkey ON public.client_properties USING btree (id);

CREATE UNIQUE INDEX client_tasks_pkey ON public.client_tasks USING btree (id);

CREATE UNIQUE INDEX clients_mobile_number_key ON public.clients USING btree (mobile_number);

CREATE INDEX idx_agent_referral_links_token ON public.agent_referral_links USING btree (ref_token);

CREATE INDEX idx_client_notifications_client_id ON public.client_notifications USING btree (client_id);

CREATE INDEX idx_client_notifications_user_id ON public.client_notifications USING btree (user_id);

CREATE INDEX idx_client_properties_client_id ON public.client_properties USING btree (client_id);

CREATE INDEX idx_client_tasks_client_id ON public.client_tasks USING btree (client_id);

CREATE INDEX idx_property_documents_client_id ON public.property_documents USING btree (client_id);

CREATE INDEX idx_property_documents_property_id ON public.property_documents USING btree (property_id);

CREATE INDEX idx_property_submissions_agency_id ON public.property_submissions USING btree (agency_id);

CREATE INDEX idx_property_submissions_agent_id ON public.property_submissions USING btree (agent_id);

CREATE INDEX idx_property_submissions_client_id ON public.property_submissions USING btree (client_id);

CREATE UNIQUE INDEX property_agency_submissions_pkey ON public.property_agency_submissions USING btree (id);

CREATE UNIQUE INDEX property_agency_submissions_property_id_agency_id_key ON public.property_agency_submissions USING btree (property_id, agency_id);

CREATE UNIQUE INDEX property_documents_pkey ON public.property_documents USING btree (id);

CREATE UNIQUE INDEX property_submissions_pkey ON public.property_submissions USING btree (id);

alter table "public"."agency_notifications" add constraint "agency_notifications_pkey" PRIMARY KEY using index "agency_notifications_pkey";

alter table "public"."agent_referral_links" add constraint "agent_referral_links_pkey" PRIMARY KEY using index "agent_referral_links_pkey";

alter table "public"."client_documents" add constraint "client_documents_pkey" PRIMARY KEY using index "client_documents_pkey";

alter table "public"."client_notifications" add constraint "client_notifications_pkey" PRIMARY KEY using index "client_notifications_pkey";

alter table "public"."client_properties" add constraint "client_properties_pkey" PRIMARY KEY using index "client_properties_pkey";

alter table "public"."client_tasks" add constraint "client_tasks_pkey" PRIMARY KEY using index "client_tasks_pkey";

alter table "public"."property_agency_submissions" add constraint "property_agency_submissions_pkey" PRIMARY KEY using index "property_agency_submissions_pkey";

alter table "public"."property_documents" add constraint "property_documents_pkey" PRIMARY KEY using index "property_documents_pkey";

alter table "public"."property_submissions" add constraint "property_submissions_pkey" PRIMARY KEY using index "property_submissions_pkey";

alter table "public"."agency_notifications" add constraint "agency_notifications_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE not valid;

alter table "public"."agency_notifications" validate constraint "agency_notifications_agency_id_fkey";

alter table "public"."agency_notifications" add constraint "agency_notifications_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."agency_notifications" validate constraint "agency_notifications_agent_id_fkey";

alter table "public"."agency_notifications" add constraint "agency_notifications_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE not valid;

alter table "public"."agency_notifications" validate constraint "agency_notifications_client_id_fkey";

alter table "public"."agency_notifications" add constraint "agency_notifications_property_id_fkey" FOREIGN KEY (property_id) REFERENCES client_properties(id) ON DELETE CASCADE not valid;

alter table "public"."agency_notifications" validate constraint "agency_notifications_property_id_fkey";

alter table "public"."agency_notifications" add constraint "agency_notifications_type_check" CHECK ((type = ANY (ARRAY['property_submitted'::text, 'client_registered'::text, 'document_uploaded'::text, 'task_completed'::text]))) not valid;

alter table "public"."agency_notifications" validate constraint "agency_notifications_type_check";

alter table "public"."agent_referral_links" add constraint "agent_referral_links_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE not valid;

alter table "public"."agent_referral_links" validate constraint "agent_referral_links_agency_id_fkey";

alter table "public"."agent_referral_links" add constraint "agent_referral_links_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."agent_referral_links" validate constraint "agent_referral_links_agent_id_fkey";

alter table "public"."agent_referral_links" add constraint "agent_referral_links_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) not valid;

alter table "public"."agent_referral_links" validate constraint "agent_referral_links_client_id_fkey";

alter table "public"."agent_referral_links" add constraint "agent_referral_links_ref_token_key" UNIQUE using index "agent_referral_links_ref_token_key";

alter table "public"."client_documents" add constraint "client_documents_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE not valid;

alter table "public"."client_documents" validate constraint "client_documents_client_id_fkey";

alter table "public"."client_documents" add constraint "client_documents_document_type_check" CHECK ((document_type = ANY (ARRAY['passport'::text, 'national_id'::text, 'driver_license'::text, 'visa'::text]))) not valid;

alter table "public"."client_documents" validate constraint "client_documents_document_type_check";

alter table "public"."client_documents" add constraint "client_documents_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES users(id) not valid;

alter table "public"."client_documents" validate constraint "client_documents_verified_by_fkey";

alter table "public"."client_notifications" add constraint "client_notifications_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE not valid;

alter table "public"."client_notifications" validate constraint "client_notifications_client_id_fkey";

alter table "public"."client_notifications" add constraint "client_notifications_property_id_fkey" FOREIGN KEY (property_id) REFERENCES client_properties(id) ON DELETE SET NULL not valid;

alter table "public"."client_notifications" validate constraint "client_notifications_property_id_fkey";

alter table "public"."client_notifications" add constraint "client_notifications_task_id_fkey" FOREIGN KEY (task_id) REFERENCES client_tasks(id) ON DELETE SET NULL not valid;

alter table "public"."client_notifications" validate constraint "client_notifications_task_id_fkey";

alter table "public"."client_notifications" add constraint "client_notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."client_notifications" validate constraint "client_notifications_user_id_fkey";

alter table "public"."client_properties" add constraint "client_properties_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES agencies(id) not valid;

alter table "public"."client_properties" validate constraint "client_properties_agency_id_fkey";

alter table "public"."client_properties" add constraint "client_properties_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES users(id) not valid;

alter table "public"."client_properties" validate constraint "client_properties_agent_id_fkey";

alter table "public"."client_properties" add constraint "client_properties_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE not valid;

alter table "public"."client_properties" validate constraint "client_properties_client_id_fkey";

alter table "public"."client_properties" add constraint "client_properties_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'in_portfolio'::text, 'submitted'::text, 'under_review'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."client_properties" validate constraint "client_properties_status_check";

alter table "public"."client_tasks" add constraint "client_tasks_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE not valid;

alter table "public"."client_tasks" validate constraint "client_tasks_agency_id_fkey";

alter table "public"."client_tasks" add constraint "client_tasks_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."client_tasks" validate constraint "client_tasks_agent_id_fkey";

alter table "public"."client_tasks" add constraint "client_tasks_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE not valid;

alter table "public"."client_tasks" validate constraint "client_tasks_client_id_fkey";

alter table "public"."client_tasks" add constraint "client_tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."client_tasks" validate constraint "client_tasks_created_by_fkey";

alter table "public"."client_tasks" add constraint "client_tasks_property_id_fkey" FOREIGN KEY (property_id) REFERENCES client_properties(id) ON DELETE CASCADE not valid;

alter table "public"."client_tasks" validate constraint "client_tasks_property_id_fkey";

alter table "public"."clients" add constraint "clients_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES agencies(id) not valid;

alter table "public"."clients" validate constraint "clients_agency_id_fkey";

alter table "public"."clients" add constraint "clients_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES users(id) not valid;

alter table "public"."clients" validate constraint "clients_agent_id_fkey";

alter table "public"."clients" add constraint "clients_mobile_number_key" UNIQUE using index "clients_mobile_number_key";

alter table "public"."clients" add constraint "clients_referral_link_id_fkey" FOREIGN KEY (referral_link_id) REFERENCES agent_referral_links(id) not valid;

alter table "public"."clients" validate constraint "clients_referral_link_id_fkey";

alter table "public"."property_agency_submissions" add constraint "property_agency_submissions_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE not valid;

alter table "public"."property_agency_submissions" validate constraint "property_agency_submissions_agency_id_fkey";

alter table "public"."property_agency_submissions" add constraint "property_agency_submissions_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES users(id) not valid;

alter table "public"."property_agency_submissions" validate constraint "property_agency_submissions_agent_id_fkey";

alter table "public"."property_agency_submissions" add constraint "property_agency_submissions_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE not valid;

alter table "public"."property_agency_submissions" validate constraint "property_agency_submissions_client_id_fkey";

alter table "public"."property_agency_submissions" add constraint "property_agency_submissions_property_id_agency_id_key" UNIQUE using index "property_agency_submissions_property_id_agency_id_key";

alter table "public"."property_agency_submissions" add constraint "property_agency_submissions_property_id_fkey" FOREIGN KEY (property_id) REFERENCES client_properties(id) ON DELETE CASCADE not valid;

alter table "public"."property_agency_submissions" validate constraint "property_agency_submissions_property_id_fkey";

alter table "public"."property_agency_submissions" add constraint "property_agency_submissions_status_check" CHECK ((status = ANY (ARRAY['submitted'::text, 'under_review'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."property_agency_submissions" validate constraint "property_agency_submissions_status_check";

alter table "public"."property_documents" add constraint "property_documents_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE not valid;

alter table "public"."property_documents" validate constraint "property_documents_client_id_fkey";

alter table "public"."property_documents" add constraint "property_documents_property_id_fkey" FOREIGN KEY (property_id) REFERENCES client_properties(id) ON DELETE CASCADE not valid;

alter table "public"."property_documents" validate constraint "property_documents_property_id_fkey";

alter table "public"."property_submissions" add constraint "property_submissions_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE not valid;

alter table "public"."property_submissions" validate constraint "property_submissions_agency_id_fkey";

alter table "public"."property_submissions" add constraint "property_submissions_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."property_submissions" validate constraint "property_submissions_agent_id_fkey";

alter table "public"."property_submissions" add constraint "property_submissions_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE not valid;

alter table "public"."property_submissions" validate constraint "property_submissions_client_id_fkey";

alter table "public"."property_submissions" add constraint "property_submissions_property_id_fkey" FOREIGN KEY (property_id) REFERENCES client_properties(id) ON DELETE CASCADE not valid;

alter table "public"."property_submissions" validate constraint "property_submissions_property_id_fkey";

DROP POLICY IF EXISTS "Allow public client registration" ON public.clients;
CREATE POLICY "Allow public client registration" ON public.clients
as permissive
for insert
to public
with check (true);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.inherit_client_agency_info()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Set agent_id and agency_id from the client record
  SELECT agent_id, agency_id 
  INTO NEW.agent_id, NEW.agency_id
  FROM public.clients 
  WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_client_agent_from_referral()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_referral_link_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_referral_link_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the referral link's last_used_at timestamp
  UPDATE public.agent_referral_links 
  SET last_used_at = now()
  WHERE ref_token = NEW.referral_token;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.on_user_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the user exists in auth.users before trying to update
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.auth_user_id) THEN
    -- Update the JWT metadata with role and agency_id
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'role', NEW.role,
        'agency_id', NEW.agency_id
      )
    WHERE id = NEW.auth_user_id;
    
    RAISE NOTICE 'Updated JWT metadata for user %: role=%, agency_id=%', NEW.auth_user_id, NEW.role, NEW.agency_id;
  END IF;
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."agency_notifications" to "anon";

grant insert on table "public"."agency_notifications" to "anon";

grant references on table "public"."agency_notifications" to "anon";

grant select on table "public"."agency_notifications" to "anon";

grant trigger on table "public"."agency_notifications" to "anon";

grant truncate on table "public"."agency_notifications" to "anon";

grant update on table "public"."agency_notifications" to "anon";

grant delete on table "public"."agency_notifications" to "authenticated";

grant insert on table "public"."agency_notifications" to "authenticated";

grant references on table "public"."agency_notifications" to "authenticated";

grant select on table "public"."agency_notifications" to "authenticated";

grant trigger on table "public"."agency_notifications" to "authenticated";

grant truncate on table "public"."agency_notifications" to "authenticated";

grant update on table "public"."agency_notifications" to "authenticated";

grant delete on table "public"."agency_notifications" to "service_role";

grant insert on table "public"."agency_notifications" to "service_role";

grant references on table "public"."agency_notifications" to "service_role";

grant select on table "public"."agency_notifications" to "service_role";

grant trigger on table "public"."agency_notifications" to "service_role";

grant truncate on table "public"."agency_notifications" to "service_role";

grant update on table "public"."agency_notifications" to "service_role";

grant delete on table "public"."agent_referral_links" to "anon";

grant insert on table "public"."agent_referral_links" to "anon";

grant references on table "public"."agent_referral_links" to "anon";

grant select on table "public"."agent_referral_links" to "anon";

grant trigger on table "public"."agent_referral_links" to "anon";

grant truncate on table "public"."agent_referral_links" to "anon";

grant update on table "public"."agent_referral_links" to "anon";

grant delete on table "public"."agent_referral_links" to "authenticated";

grant insert on table "public"."agent_referral_links" to "authenticated";

grant references on table "public"."agent_referral_links" to "authenticated";

grant select on table "public"."agent_referral_links" to "authenticated";

grant trigger on table "public"."agent_referral_links" to "authenticated";

grant truncate on table "public"."agent_referral_links" to "authenticated";

grant update on table "public"."agent_referral_links" to "authenticated";

grant delete on table "public"."agent_referral_links" to "service_role";

grant insert on table "public"."agent_referral_links" to "service_role";

grant references on table "public"."agent_referral_links" to "service_role";

grant select on table "public"."agent_referral_links" to "service_role";

grant trigger on table "public"."agent_referral_links" to "service_role";

grant truncate on table "public"."agent_referral_links" to "service_role";

grant update on table "public"."agent_referral_links" to "service_role";

grant delete on table "public"."client_documents" to "anon";

grant insert on table "public"."client_documents" to "anon";

grant references on table "public"."client_documents" to "anon";

grant select on table "public"."client_documents" to "anon";

grant trigger on table "public"."client_documents" to "anon";

grant truncate on table "public"."client_documents" to "anon";

grant update on table "public"."client_documents" to "anon";

grant delete on table "public"."client_documents" to "authenticated";

grant insert on table "public"."client_documents" to "authenticated";

grant references on table "public"."client_documents" to "authenticated";

grant select on table "public"."client_documents" to "authenticated";

grant trigger on table "public"."client_documents" to "authenticated";

grant truncate on table "public"."client_documents" to "authenticated";

grant update on table "public"."client_documents" to "authenticated";

grant delete on table "public"."client_documents" to "service_role";

grant insert on table "public"."client_documents" to "service_role";

grant references on table "public"."client_documents" to "service_role";

grant select on table "public"."client_documents" to "service_role";

grant trigger on table "public"."client_documents" to "service_role";

grant truncate on table "public"."client_documents" to "service_role";

grant update on table "public"."client_documents" to "service_role";

grant delete on table "public"."client_notifications" to "anon";

grant insert on table "public"."client_notifications" to "anon";

grant references on table "public"."client_notifications" to "anon";

grant select on table "public"."client_notifications" to "anon";

grant trigger on table "public"."client_notifications" to "anon";

grant truncate on table "public"."client_notifications" to "anon";

grant update on table "public"."client_notifications" to "anon";

grant delete on table "public"."client_notifications" to "authenticated";

grant insert on table "public"."client_notifications" to "authenticated";

grant references on table "public"."client_notifications" to "authenticated";

grant select on table "public"."client_notifications" to "authenticated";

grant trigger on table "public"."client_notifications" to "authenticated";

grant truncate on table "public"."client_notifications" to "authenticated";

grant update on table "public"."client_notifications" to "authenticated";

grant delete on table "public"."client_notifications" to "service_role";

grant insert on table "public"."client_notifications" to "service_role";

grant references on table "public"."client_notifications" to "service_role";

grant select on table "public"."client_notifications" to "service_role";

grant trigger on table "public"."client_notifications" to "service_role";

grant truncate on table "public"."client_notifications" to "service_role";

grant update on table "public"."client_notifications" to "service_role";

grant delete on table "public"."client_properties" to "anon";

grant insert on table "public"."client_properties" to "anon";

grant references on table "public"."client_properties" to "anon";

grant select on table "public"."client_properties" to "anon";

grant trigger on table "public"."client_properties" to "anon";

grant truncate on table "public"."client_properties" to "anon";

grant update on table "public"."client_properties" to "anon";

grant delete on table "public"."client_properties" to "authenticated";

grant insert on table "public"."client_properties" to "authenticated";

grant references on table "public"."client_properties" to "authenticated";

grant select on table "public"."client_properties" to "authenticated";

grant trigger on table "public"."client_properties" to "authenticated";

grant truncate on table "public"."client_properties" to "authenticated";

grant update on table "public"."client_properties" to "authenticated";

grant delete on table "public"."client_properties" to "service_role";

grant insert on table "public"."client_properties" to "service_role";

grant references on table "public"."client_properties" to "service_role";

grant select on table "public"."client_properties" to "service_role";

grant trigger on table "public"."client_properties" to "service_role";

grant truncate on table "public"."client_properties" to "service_role";

grant update on table "public"."client_properties" to "service_role";

grant delete on table "public"."client_tasks" to "anon";

grant insert on table "public"."client_tasks" to "anon";

grant references on table "public"."client_tasks" to "anon";

grant select on table "public"."client_tasks" to "anon";

grant trigger on table "public"."client_tasks" to "anon";

grant truncate on table "public"."client_tasks" to "anon";

grant update on table "public"."client_tasks" to "anon";

grant delete on table "public"."client_tasks" to "authenticated";

grant insert on table "public"."client_tasks" to "authenticated";

grant references on table "public"."client_tasks" to "authenticated";

grant select on table "public"."client_tasks" to "authenticated";

grant trigger on table "public"."client_tasks" to "authenticated";

grant truncate on table "public"."client_tasks" to "authenticated";

grant update on table "public"."client_tasks" to "authenticated";

grant delete on table "public"."client_tasks" to "service_role";

grant insert on table "public"."client_tasks" to "service_role";

grant references on table "public"."client_tasks" to "service_role";

grant select on table "public"."client_tasks" to "service_role";

grant trigger on table "public"."client_tasks" to "service_role";

grant truncate on table "public"."client_tasks" to "service_role";

grant update on table "public"."client_tasks" to "service_role";

grant delete on table "public"."property_agency_submissions" to "anon";

grant insert on table "public"."property_agency_submissions" to "anon";

grant references on table "public"."property_agency_submissions" to "anon";

grant select on table "public"."property_agency_submissions" to "anon";

grant trigger on table "public"."property_agency_submissions" to "anon";

grant truncate on table "public"."property_agency_submissions" to "anon";

grant update on table "public"."property_agency_submissions" to "anon";

grant delete on table "public"."property_agency_submissions" to "authenticated";

grant insert on table "public"."property_agency_submissions" to "authenticated";

grant references on table "public"."property_agency_submissions" to "authenticated";

grant select on table "public"."property_agency_submissions" to "authenticated";

grant trigger on table "public"."property_agency_submissions" to "authenticated";

grant truncate on table "public"."property_agency_submissions" to "authenticated";

grant update on table "public"."property_agency_submissions" to "authenticated";

grant delete on table "public"."property_agency_submissions" to "service_role";

grant insert on table "public"."property_agency_submissions" to "service_role";

grant references on table "public"."property_agency_submissions" to "service_role";

grant select on table "public"."property_agency_submissions" to "service_role";

grant trigger on table "public"."property_agency_submissions" to "service_role";

grant truncate on table "public"."property_agency_submissions" to "service_role";

grant update on table "public"."property_agency_submissions" to "service_role";

grant delete on table "public"."property_documents" to "anon";

grant insert on table "public"."property_documents" to "anon";

grant references on table "public"."property_documents" to "anon";

grant select on table "public"."property_documents" to "anon";

grant trigger on table "public"."property_documents" to "anon";

grant truncate on table "public"."property_documents" to "anon";

grant update on table "public"."property_documents" to "anon";

grant delete on table "public"."property_documents" to "authenticated";

grant insert on table "public"."property_documents" to "authenticated";

grant references on table "public"."property_documents" to "authenticated";

grant select on table "public"."property_documents" to "authenticated";

grant trigger on table "public"."property_documents" to "authenticated";

grant truncate on table "public"."property_documents" to "authenticated";

grant update on table "public"."property_documents" to "authenticated";

grant delete on table "public"."property_documents" to "service_role";

grant insert on table "public"."property_documents" to "service_role";

grant references on table "public"."property_documents" to "service_role";

grant select on table "public"."property_documents" to "service_role";

grant trigger on table "public"."property_documents" to "service_role";

grant truncate on table "public"."property_documents" to "service_role";

grant update on table "public"."property_documents" to "service_role";

grant delete on table "public"."property_submissions" to "anon";

grant insert on table "public"."property_submissions" to "anon";

grant references on table "public"."property_submissions" to "anon";

grant select on table "public"."property_submissions" to "anon";

grant trigger on table "public"."property_submissions" to "anon";

grant truncate on table "public"."property_submissions" to "anon";

grant update on table "public"."property_submissions" to "anon";

grant delete on table "public"."property_submissions" to "authenticated";

grant insert on table "public"."property_submissions" to "authenticated";

grant references on table "public"."property_submissions" to "authenticated";

grant select on table "public"."property_submissions" to "authenticated";

grant trigger on table "public"."property_submissions" to "authenticated";

grant truncate on table "public"."property_submissions" to "authenticated";

grant update on table "public"."property_submissions" to "authenticated";

grant delete on table "public"."property_submissions" to "service_role";

grant insert on table "public"."property_submissions" to "service_role";

grant references on table "public"."property_submissions" to "service_role";

grant select on table "public"."property_submissions" to "service_role";

grant trigger on table "public"."property_submissions" to "service_role";

grant truncate on table "public"."property_submissions" to "service_role";

grant update on table "public"."property_submissions" to "service_role";

create policy "Agency admins can view their notifications"
on "public"."agency_notifications"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((auth.uid() = users.auth_user_id) AND (users.role = 'agency_admin'::user_role) AND (users.agency_id = agency_notifications.agency_id)))));


create policy "Agency admins can view agency referral links"
on "public"."agent_referral_links"
as permissive
for select
to public
using (((agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text)));


create policy "Agents can manage own referral links"
on "public"."agent_referral_links"
as permissive
for all
to authenticated
using ((agent_id = auth.uid()));


create policy "Agents can manage their referral links"
on "public"."agent_referral_links"
as permissive
for all
to public
using (((agent_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)));


create policy "Agents and admins can view client documents"
on "public"."client_documents"
as permissive
for all
to authenticated
using ((client_id IN ( SELECT c.id
   FROM clients c
  WHERE ((c.agent_id = auth.uid()) OR (c.agency_id IN ( SELECT u.agency_id
           FROM users u
          WHERE (u.auth_user_id = auth.uid())))))));


create policy "Allow client document uploads"
on "public"."client_documents"
as permissive
for insert
to public
with check (true);


create policy "Clients can view own documents"
on "public"."client_documents"
as permissive
for select
to public
using (true);


create policy "Agency staff can create client notifications"
on "public"."client_notifications"
as permissive
for insert
to public
with check ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = ANY (ARRAY['agency_admin'::text, 'agent'::text])));


create policy "Users can view their notifications"
on "public"."client_notifications"
as permissive
for select
to public
using (((client_id IS NOT NULL) OR (user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = auth.uid())))));


create policy "Agency admins can view agency properties"
on "public"."client_properties"
as permissive
for select
to authenticated
using ((agency_id IN ( SELECT u.agency_id
   FROM users u
  WHERE (u.auth_user_id = auth.uid()))));


create policy "Agency admins can view submitted properties"
on "public"."client_properties"
as permissive
for select
to public
using ((id IN ( SELECT ps.property_id
   FROM property_submissions ps
  WHERE ((ps.agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text)))));


create policy "Agents can view their clients' properties"
on "public"."client_properties"
as permissive
for select
to authenticated
using ((agent_id = auth.uid()));


create policy "Agents can view their referred properties"
on "public"."client_properties"
as permissive
for select
to public
using ((id IN ( SELECT ps.property_id
   FROM property_submissions ps
  WHERE ((ps.agent_id = ( SELECT users.id
           FROM users
          WHERE (users.auth_user_id = auth.uid()))) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)))));


create policy "Clients can manage own properties"
on "public"."client_properties"
as permissive
for all
to public
using ((client_id IN ( SELECT clients.id
   FROM clients
  WHERE (clients.phone = ((current_setting('request.jwt.claims'::text, true))::json ->> 'phone'::text)))));


create policy "Clients can manage their own properties"
on "public"."client_properties"
as permissive
for all
to public
using ((client_id IN ( SELECT clients.id
   FROM clients
  WHERE (clients.id = client_properties.client_id))));


create policy "Agency staff can manage tasks"
on "public"."client_tasks"
as permissive
for all
to public
using (((agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid) AND ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text) OR ((agent_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)))));


create policy "Allow public client registration"
on "public"."clients"
as permissive
for insert
to public
with check (true);


create policy "Clients can update own records"
on "public"."clients"
as permissive
for update
to public
using (true);


create policy "Clients can view own records"
on "public"."clients"
as permissive
for select
to public
using (true);


create policy "Clients can create submissions"
on "public"."property_agency_submissions"
as permissive
for insert
to public
with check ((client_id IN ( SELECT clients.id
   FROM clients
  WHERE (clients.phone = current_setting('app.current_client_phone'::text, true)))));


create policy "Clients can view their own submissions"
on "public"."property_agency_submissions"
as permissive
for select
to public
using ((client_id IN ( SELECT clients.id
   FROM clients
  WHERE (clients.phone = current_setting('app.current_client_phone'::text, true)))));


create policy "Agency admins can view property documents"
on "public"."property_documents"
as permissive
for select
to authenticated
using ((property_id IN ( SELECT client_properties.id
   FROM client_properties
  WHERE (client_properties.agency_id IN ( SELECT u.agency_id
           FROM users u
          WHERE (u.auth_user_id = auth.uid()))))));


create policy "Agency staff can view submitted property documents"
on "public"."property_documents"
as permissive
for select
to public
using ((property_id IN ( SELECT ps.property_id
   FROM property_submissions ps
  WHERE ((ps.agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid) AND ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text) OR ((ps.agent_id = ( SELECT users.id
           FROM users
          WHERE (users.auth_user_id = auth.uid()))) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)))))));


create policy "Agents can view property documents"
on "public"."property_documents"
as permissive
for select
to authenticated
using ((property_id IN ( SELECT client_properties.id
   FROM client_properties
  WHERE (client_properties.agent_id = auth.uid()))));


create policy "Clients can manage their property documents"
on "public"."property_documents"
as permissive
for all
to public
using ((client_id IN ( SELECT clients.id
   FROM clients
  WHERE (clients.id = property_documents.client_id))));


create policy "Property documents follow property access"
on "public"."property_documents"
as permissive
for all
to public
using ((property_id IN ( SELECT client_properties.id
   FROM client_properties
  WHERE (client_properties.client_id IN ( SELECT clients.id
           FROM clients
          WHERE (clients.phone = ((current_setting('request.jwt.claims'::text, true))::json ->> 'phone'::text)))))));


create policy "Agency admins can manage submissions"
on "public"."property_submissions"
as permissive
for all
to public
using (((agency_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'agency_id'::text))::uuid) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agency_admin'::text)));


create policy "Agents can view their submissions"
on "public"."property_submissions"
as permissive
for select
to public
using (((agent_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_user_id = auth.uid()))) AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'agent'::text)));


create policy "Admins can manage agencies based on JWT role"
on "public"."agencies"
as permissive
for all
to public
using ((((((auth.jwt() ->> 'app_metadata'::text))::jsonb ->> 'role'::text) = 'superadmin'::text) OR (id = ((((auth.jwt() ->> 'app_metadata'::text))::jsonb ->> 'agency_id'::text))::uuid)))
with check (((((auth.jwt() ->> 'app_metadata'::text))::jsonb ->> 'role'::text) = 'superadmin'::text));


CREATE TRIGGER inherit_agency_info BEFORE INSERT ON public.client_properties FOR EACH ROW EXECUTE FUNCTION inherit_client_agency_info();

CREATE TRIGGER on_property_submitted AFTER INSERT ON public.client_properties FOR EACH ROW EXECUTE FUNCTION create_property_notification();

CREATE TRIGGER on_client_referral_set AFTER INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION set_client_agent_from_referral();

CREATE TRIGGER on_client_registered AFTER UPDATE ON public.clients FOR EACH ROW WHEN (((old.is_verified = false) AND (new.is_verified = true))) EXECUTE FUNCTION update_referral_link_client();

CREATE TRIGGER update_referral_usage AFTER INSERT ON public.clients FOR EACH ROW WHEN ((new.referral_token IS NOT NULL)) EXECUTE FUNCTION update_referral_link_usage();

CREATE TRIGGER on_user_updated_trigger AFTER INSERT OR UPDATE OF role, agency_id, auth_user_id ON public.users FOR EACH ROW EXECUTE FUNCTION on_user_updated();


