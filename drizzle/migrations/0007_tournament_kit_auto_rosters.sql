ALTER TABLE public.tournaments ADD COLUMN kit text;
ALTER TABLE public.tournaments ADD CONSTRAINT tournament_kit_valid CHECK (kit IS NULL OR kit IN ('sword','axe','mace','spearmace','uhc','smp','diasmp','diapot','nethop','bowcart','xbowcart'));
ALTER TABLE public.tournament_players ADD COLUMN ladder_player_id uuid REFERENCES public.players(id) ON DELETE CASCADE;
COMMENT ON COLUMN public.tournament_players.ladder_player_id IS 'Stable ladder identity for automatically registered players; NULL for manual registrations.';
CREATE UNIQUE INDEX tournament_auto_player_unique ON public.tournament_players(tournament_id, ladder_player_id) WHERE ladder_player_id IS NOT NULL;
CREATE FUNCTION public.lock_tournament_roster_writes() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(72103491);
 RETURN NULL;
END;
$$;
CREATE TRIGGER tournament_roster_write_lock BEFORE INSERT OR UPDATE OR DELETE ON public.tournament_players FOR EACH STATEMENT EXECUTE FUNCTION public.lock_tournament_roster_writes();
CREATE TRIGGER tournament_selection_write_lock BEFORE INSERT OR UPDATE OR DELETE ON public.tournaments FOR EACH STATEMENT EXECUTE FUNCTION public.lock_tournament_roster_writes();
CREATE TRIGGER tournament_tier_write_lock BEFORE INSERT OR UPDATE OR DELETE ON public.player_tiers FOR EACH STATEMENT EXECUTE FUNCTION public.lock_tournament_roster_writes();
CREATE TRIGGER tournament_identity_write_lock BEFORE INSERT OR UPDATE OR DELETE ON public.players FOR EACH STATEMENT EXECUTE FUNCTION public.lock_tournament_roster_writes();
CREATE FUNCTION public.enforce_tournament_capacity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF (SELECT count(*) FROM public.tournament_players WHERE tournament_id = NEW.tournament_id AND id <> NEW.id) >= 10 THEN
  RAISE EXCEPTION 'Tournament is full (max 10 players)' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER tournament_capacity BEFORE INSERT OR UPDATE OF tournament_id ON public.tournament_players FOR EACH ROW EXECUTE FUNCTION public.enforce_tournament_capacity();
CREATE FUNCTION public.sync_tournament_lt3_roster(p_tournament_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE selected_kit text; candidate record; slots integer;
BEGIN
 PERFORM pg_advisory_xact_lock(72103491);
 SELECT kit INTO selected_kit FROM public.tournaments WHERE id = p_tournament_id FOR UPDATE;
 IF selected_kit IS NULL THEN RETURN; END IF;
 DELETE FROM public.tournament_players tp WHERE tp.tournament_id = p_tournament_id AND tp.ladder_player_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.player_tiers pt WHERE pt.player_id = tp.ladder_player_id AND pt.kit = selected_kit AND pt.tier IN ('LT3','HT3','LT2','HT2','LT1','HT1')
 );
 SELECT greatest(0, 10 - count(*)::integer) INTO slots FROM public.tournament_players WHERE tournament_id = p_tournament_id;
 FOR candidate IN SELECT p.id, p.username, p.mc_uuid FROM public.players p JOIN public.player_tiers pt ON pt.player_id = p.id
  WHERE pt.kit = selected_kit AND pt.tier = 'LT3' AND NOT EXISTS (
   SELECT 1 FROM public.tournament_players tp WHERE tp.tournament_id = p_tournament_id AND (tp.ladder_player_id = p.id OR lower(tp.username) = lower(p.username) OR (p.mc_uuid IS NOT NULL AND replace(lower(tp.mc_uuid), '-', '') = replace(lower(p.mc_uuid), '-', '')))
  ) ORDER BY pt.updated_at, p.id
 LOOP
  EXIT WHEN slots <= 0;
  INSERT INTO public.tournament_players(tournament_id, username, mc_uuid, ladder_player_id) VALUES (p_tournament_id, candidate.username, candidate.mc_uuid, candidate.id);
  slots := slots - 1;
 END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_tournament_lt3_roster(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_tournament_lt3_roster(uuid) TO service_role;
CREATE FUNCTION public.sync_tournaments_after_tier() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t record; old_kit text; new_kit text;
BEGIN
 IF TG_OP <> 'INSERT' THEN old_kit := OLD.kit; END IF;
 IF TG_OP <> 'DELETE' THEN new_kit := NEW.kit; END IF;
 FOR t IN SELECT id FROM public.tournaments WHERE kit = old_kit OR kit = new_kit ORDER BY id LOOP
  PERFORM public.sync_tournament_lt3_roster(t.id);
 END LOOP;
 RETURN NULL;
END;
$$;
CREATE TRIGGER sync_tournaments_after_tier AFTER INSERT OR UPDATE OR DELETE ON public.player_tiers FOR EACH ROW EXECUTE FUNCTION public.sync_tournaments_after_tier();
CREATE FUNCTION public.sync_tournament_after_selection() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND OLD.kit IS DISTINCT FROM NEW.kit THEN
  IF NEW.kit IS NULL THEN
   UPDATE public.tournament_players SET ladder_player_id = NULL WHERE tournament_id = NEW.id AND ladder_player_id IS NOT NULL;
  ELSE
   DELETE FROM public.tournament_players WHERE tournament_id = NEW.id AND ladder_player_id IS NOT NULL;
  END IF;
 END IF;
 PERFORM public.sync_tournament_lt3_roster(NEW.id);
 RETURN NULL;
END;
$$;
CREATE TRIGGER sync_tournament_after_selection AFTER INSERT OR UPDATE OF kit ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.sync_tournament_after_selection();
REVOKE ALL ON FUNCTION public.enforce_tournament_capacity(), public.sync_tournaments_after_tier(), public.sync_tournament_after_selection() FROM PUBLIC, anon, authenticated;