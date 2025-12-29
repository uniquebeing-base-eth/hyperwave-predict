-- Leaderboard bets sourced from on-chain settlement (written by backend, readable by everyone)
CREATE TABLE IF NOT EXISTS public.leaderboard_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_bet_id bigint NOT NULL,
  round_id bigint NOT NULL,
  wallet_address text NOT NULL,
  direction text NOT NULL,
  amount numeric NOT NULL,
  result text NOT NULL,
  payout numeric NOT NULL DEFAULT 0,
  placed_at timestamptz NOT NULL,
  settled_at timestamptz,
  start_price numeric,
  end_price numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotent upserts when syncing
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_bets_chain_bet_id_idx
  ON public.leaderboard_bets (chain_bet_id);

CREATE INDEX IF NOT EXISTS leaderboard_bets_placed_at_idx
  ON public.leaderboard_bets (placed_at DESC);

CREATE INDEX IF NOT EXISTS leaderboard_bets_wallet_address_idx
  ON public.leaderboard_bets (wallet_address);

ALTER TABLE public.leaderboard_bets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leaderboard_bets'
      AND policyname = 'Anyone can view leaderboard bets'
  ) THEN
    CREATE POLICY "Anyone can view leaderboard bets"
    ON public.leaderboard_bets
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- RPC for leaderboard aggregation by timeframe
CREATE OR REPLACE FUNCTION public.get_leaderboard(period text)
RETURNS TABLE (
  wallet_address text,
  total_bets integer,
  total_wins integer,
  total_losses integer,
  win_rate numeric,
  staked numeric,
  payout numeric,
  profit numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH filtered AS (
    SELECT *
    FROM public.leaderboard_bets
    WHERE CASE
      WHEN period = '24h' THEN placed_at >= now() - interval '24 hours'
      WHEN period = '7d' THEN placed_at >= now() - interval '7 days'
      WHEN period = '30d' THEN placed_at >= now() - interval '30 days'
      ELSE true
    END
  )
  SELECT
    wallet_address,
    COUNT(*)::int AS total_bets,
    SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END)::int AS total_wins,
    SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END)::int AS total_losses,
    CASE
      WHEN COUNT(*) > 0
      THEN (SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100
      ELSE 0
    END AS win_rate,
    COALESCE(SUM(amount), 0)::numeric AS staked,
    COALESCE(SUM(payout), 0)::numeric AS payout,
    (COALESCE(SUM(payout), 0) - COALESCE(SUM(amount), 0))::numeric AS profit
  FROM filtered
  GROUP BY wallet_address
  HAVING COUNT(*) > 0
  ORDER BY total_wins DESC, win_rate DESC
  LIMIT 50;
$$;