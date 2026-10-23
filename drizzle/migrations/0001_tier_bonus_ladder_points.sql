ALTER TABLE public.player_tiers ADD COLUMN bonus_points integer NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.player_tiers.bonus_points IS 'Signed additional Ladder points for this player and kit; staff-managed defence bonuses.';
CREATE OR REPLACE FUNCTION public.adjust_tier_bonus(p_player_id uuid, p_kit text, p_delta integer)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE result integer;
BEGIN
  IF p_delta NOT IN (50, -15) THEN
    RAISE EXCEPTION 'Invalid defence adjustment';
  END IF;
  UPDATE public.player_tiers SET bonus_points = bonus_points + p_delta, updated_at = now()
  WHERE player_id = p_player_id AND kit = p_kit
  RETURNING bonus_points INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assign a tier first'; END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.adjust_tier_bonus(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_tier_bonus(uuid, text, integer) TO service_role;