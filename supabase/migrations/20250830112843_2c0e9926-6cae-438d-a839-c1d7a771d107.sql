-- RLS policies to allow portal inserts/upserts by phone
-- 1) INSERT policy for anon/auth users (active rows only)
DROP POLICY IF EXISTS portal_clients_insert_by_phone ON public.clients;
CREATE POLICY portal_clients_insert_by_phone
ON public.clients
FOR INSERT
TO anon, authenticated
WITH CHECK (
  NOT is_quarantined
  AND phone_e164 IS NOT NULL
);

-- 2) Optional UPDATE policy for true upserts (merge path)
DROP POLICY IF EXISTS portal_clients_update_active ON public.clients;
CREATE POLICY portal_clients_update_active
ON public.clients
FOR UPDATE
TO anon, authenticated
USING (NOT is_quarantined)
WITH CHECK (NOT is_quarantined);
