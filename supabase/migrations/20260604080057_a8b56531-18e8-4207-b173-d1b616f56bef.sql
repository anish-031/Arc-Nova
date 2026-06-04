-- 1) Remove direct INSERT on purchases (only service_role via server function may insert verified purchases)
DROP POLICY IF EXISTS "insert own purchases" ON public.purchases;

-- 2) Scope realtime.messages reads to channels owned by the user
DROP POLICY IF EXISTS "authenticated can read realtime messages" ON realtime.messages;
CREATE POLICY "users read own realtime channels"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() = 'purchases:' || auth.uid()::text
  );