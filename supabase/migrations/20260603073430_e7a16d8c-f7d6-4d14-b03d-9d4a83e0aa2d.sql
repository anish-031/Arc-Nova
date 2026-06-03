-- 1. Lock down user_roles: explicitly prevent non-admins from inserting/updating/deleting roles.
-- Add restrictive policies that require admin for any write, in addition to the existing permissive policy.
CREATE POLICY "only admins insert roles"
  ON public.user_roles AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "only admins update roles"
  ON public.user_roles AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "only admins delete roles"
  ON public.user_roles AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Lock down Realtime: require authenticated session to subscribe to any channel.
-- postgres_changes already enforces row-level RLS from the source table (purchases),
-- so per-user filtering is preserved. This restrictive policy blocks anonymous subscribers.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read realtime messages" ON realtime.messages;
CREATE POLICY "authenticated can read realtime messages"
  ON realtime.messages
  FOR SELECT TO authenticated
  USING (true);