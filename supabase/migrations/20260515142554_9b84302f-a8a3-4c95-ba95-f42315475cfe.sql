ALTER TABLE public.phase_claims
  ADD COLUMN IF NOT EXISTS tx_hash text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_phase_claims_wallet ON public.phase_claims(wallet_address);
CREATE INDEX IF NOT EXISTS idx_phase_claims_phase ON public.phase_claims(phase_number);