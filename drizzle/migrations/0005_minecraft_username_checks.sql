ALTER TABLE public.players ADD COLUMN username_checked_at timestamptz;
ALTER TABLE public.tournament_players ADD COLUMN username_checked_at timestamptz;
CREATE INDEX players_username_check_queue ON public.players (username_checked_at ASC NULLS FIRST) WHERE mc_uuid IS NOT NULL;
CREATE INDEX tournament_username_check_queue ON public.tournament_players (username_checked_at ASC NULLS FIRST) WHERE mc_uuid IS NOT NULL;
COMMENT ON COLUMN public.players.username_checked_at IS 'Last official UUID username check attempt; failed lookups retain the saved username.';
COMMENT ON COLUMN public.tournament_players.username_checked_at IS 'Last official UUID username check attempt; records and permanent account identity are unchanged.';