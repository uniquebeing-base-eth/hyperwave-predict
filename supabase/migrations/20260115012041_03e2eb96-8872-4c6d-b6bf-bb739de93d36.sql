-- Global 7-day phase cycle state (singleton)
CREATE TABLE IF NOT EXISTS public.phase_state (
  id integer PRIMARY KEY,
  phase_number integer NOT NULL DEFAULT 1,
  phase_started_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.phase_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'phase_state'
      AND policyname = 'Anyone can view phase state'
  ) THEN
    CREATE POLICY "Anyone can view phase state"
    ON public.phase_state
    FOR SELECT
    USING (true);
  END IF;
END
$$;

-- Reset the phase cycle to start fresh now for everyone (Phase 1, 7 days)
INSERT INTO public.phase_state (id, phase_number, phase_started_at, updated_at)
VALUES (1, 1, now(), now())
ON CONFLICT (id)
DO UPDATE SET
  phase_number = EXCLUDED.phase_number,
  phase_started_at = EXCLUDED.phase_started_at,
  updated_at = EXCLUDED.updated_at;
