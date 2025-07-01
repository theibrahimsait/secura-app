create policy "Allow property document access"
on "storage"."objects"
as permissive
for select
to public
using (((bucket_id = 'property-documents'::text) AND ((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text))));


create policy "Allow property document deletes"
on "storage"."objects"
as permissive
for delete
to public
using (((bucket_id = 'property-documents'::text) AND ((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text))));


create policy "Allow property document updates"
on "storage"."objects"
as permissive
for update
to public
using (((bucket_id = 'property-documents'::text) AND ((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text))));


create policy "Allow property document uploads"
on "storage"."objects"
as permissive
for insert
to public
with check ((bucket_id = 'property-documents'::text));



