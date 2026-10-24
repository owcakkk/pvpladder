CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'PvP Ladder Tournament',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tournaments TO anon, authenticated;
GRANT ALL ON public.tournaments TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournaments public read" ON public.tournaments FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.tournament_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  username text NOT NULL,
  mc_uuid text,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, username)
);
GRANT SELECT ON public.tournament_players TO anon, authenticated;
GRANT ALL ON public.tournament_players TO service_role;
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournament players public read" ON public.tournament_players FOR SELECT TO anon, authenticated USING (true);