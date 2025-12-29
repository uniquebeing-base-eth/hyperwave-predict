-- Fix search path for the leaderboard function
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
SECURITY INVOKER
SET search_path = public
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