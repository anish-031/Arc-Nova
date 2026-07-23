
CREATE TABLE public.swap_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address text,
  token_in text NOT NULL,
  token_out text NOT NULL,
  amount_in numeric NOT NULL,
  amount_out numeric,
  min_received numeric,
  rate numeric,
  gas_gwei numeric,
  tx_hash text,
  explorer_url text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.swap_attempts TO authenticated;
GRANT ALL ON public.swap_attempts TO service_role;

ALTER TABLE public.swap_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own swaps" ON public.swap_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own swaps" ON public.swap_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own swaps" ON public.swap_attempts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX swap_attempts_user_created_idx ON public.swap_attempts (user_id, created_at DESC);
