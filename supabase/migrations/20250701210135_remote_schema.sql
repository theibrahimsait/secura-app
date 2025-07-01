alter type "public"."audit_action" rename to "audit_action__old_version_to_be_dropped";

create type "public"."audit_action" as enum ('login', 'logout', 'view', 'download', 'upload', 'create', 'update', 'delete', 'sms_sent');

alter table "public"."audit_logs" alter column action type "public"."audit_action" using action::text::"public"."audit_action";

-- drop type "public"."audit_action__old_version_to_be_dropped";


