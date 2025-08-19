-- Fix linter ERROR 0010: Security Definer View
-- Ensure the view executes with the querying user's privileges (security invoker)
-- This preserves RLS on underlying tables and avoids privilege escalation.

ALTER VIEW IF EXISTS public.clients_agent_view
  SET (security_invoker = on);
