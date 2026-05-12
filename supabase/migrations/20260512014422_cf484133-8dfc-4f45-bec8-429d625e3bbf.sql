CREATE TABLE IF NOT EXISTS public.phase_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  phase_number integer NOT NULL,
  amount numeric NOT NULL,
  multiplier integer NOT NULL DEFAULT 1,
  nonce text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wallet_address, phase_number)
);

ALTER TABLE public.phase_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view phase claims"
  ON public.phase_claims FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_phase_claims_wallet ON public.phase_claims (wallet_address);