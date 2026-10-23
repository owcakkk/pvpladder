ALTER TABLE public.player_tiers ADD COLUMN tier_lp integer;
ALTER TABLE public.player_tiers ADD CONSTRAINT tier_lp_range CHECK (tier_lp IS NULL OR tier_lp BETWEEN 0 AND 400);
COMMENT ON COLUMN public.player_tiers.tier_lp IS 'Staff-entered per-kit LP for LT5 through LT3; null means not yet tested. Maximum 400.';