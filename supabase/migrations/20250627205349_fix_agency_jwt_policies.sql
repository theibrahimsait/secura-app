drop trigger if exists "update_jwt_metadata_trigger" on "public"."users";

-- drop policy "Users can view their own agency" on "public"."agencies";

-- drop policy "Admins can manage users based on JWT role" on "public"."users";

-- drop policy "Users can view their own profile" on "public"."users";

drop policy "Admins can manage agencies based on JWT role" on "public"."agencies";

drop function if exists "public"."update_user_jwt_metadata"();

create policy "Admins can manage agencies based on JWT role"
on "public"."agencies"
as permissive
for all
to public
using ((((((auth.jwt() ->> 'app_metadata'::text))::jsonb ->> 'role'::text) = 'superadmin'::text) OR (id = ((((auth.jwt() ->> 'app_metadata'::text))::jsonb ->> 'agency_id'::text))::uuid)))
with check (((((auth.jwt() ->> 'app_metadata'::text))::jsonb ->> 'role'::text) = 'superadmin'::text));



