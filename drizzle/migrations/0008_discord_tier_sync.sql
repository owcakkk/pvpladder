ALTER TABLE public.player_tiers ADD COLUMN username text, ADD COLUMN kit_name text, ADD COLUMN total_lp integer, ADD COLUMN categories jsonb, ADD COLUMN tested_at bigint;
ALTER TABLE public.player_tiers ADD CONSTRAINT bot_total_lp_nonnegative CHECK(total_lp IS NULL OR total_lp >= 0);
UPDATE public.player_tiers pt SET username = p.username FROM public.players p WHERE p.id = pt.player_id;
CREATE UNIQUE INDEX player_tiers_username_kit_unique ON public.player_tiers(lower(username), kit);
REVOKE INSERT, UPDATE, DELETE ON public.player_tiers FROM anon, authenticated;
CREATE TABLE public.tier_sync_metadata (
 player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
 kit text NOT NULL,
 discord_id text, tester_id text, guild_id text,
 PRIMARY KEY(player_id, kit)
);
GRANT ALL ON public.tier_sync_metadata TO service_role;
ALTER TABLE public.tier_sync_metadata ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.populate_tier_username() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 SELECT username INTO NEW.username FROM public.players WHERE id = NEW.player_id;
 RETURN NEW;
END;
$$;
CREATE TRIGGER populate_tier_username BEFORE INSERT OR UPDATE ON public.player_tiers FOR EACH ROW EXECUTE FUNCTION public.populate_tier_username();
CREATE FUNCTION public.refresh_tier_username() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 UPDATE public.player_tiers SET username = NEW.username WHERE player_id = NEW.id;
 RETURN NULL;
END;
$$;
CREATE TRIGGER refresh_tier_username AFTER UPDATE OF username ON public.players FOR EACH ROW WHEN (OLD.username IS DISTINCT FROM NEW.username) EXECUTE FUNCTION public.refresh_tier_username();
CREATE FUNCTION public.apply_discord_tier_sync(payload jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE item jsonb; pid uuid; existing_uuid text;
BEGIN
 PERFORM pg_advisory_xact_lock(72103491);
 FOR item IN SELECT value FROM jsonb_array_elements(payload) LOOP
  SELECT id, mc_uuid INTO pid, existing_uuid FROM public.players WHERE lower(username) = lower(item->>'username') LIMIT 1;
  IF pid IS NULL AND item->>'uuid' IS NOT NULL THEN
   SELECT id, mc_uuid INTO pid, existing_uuid FROM public.players WHERE replace(lower(mc_uuid),'-','') = replace(lower(item->>'uuid'),'-','') LIMIT 1;
  END IF;
  IF pid IS NULL THEN
   INSERT INTO public.players(username, mc_uuid, region) VALUES(item->>'username',item->>'uuid',coalesce(item->>'region','EU')) RETURNING id INTO pid;
  ELSIF existing_uuid IS NOT NULL AND item->>'uuid' IS NOT NULL AND replace(lower(existing_uuid),'-','') <> replace(lower(item->>'uuid'),'-','') THEN
   RAISE EXCEPTION 'Minecraft identity conflict';
  END IF;
  IF EXISTS(SELECT 1 FROM public.player_tiers WHERE player_id = pid AND kit = item->>'kit' AND tested_at >= (item->>'testedAt')::bigint) THEN CONTINUE; END IF;
  INSERT INTO public.player_tiers(player_id,kit,tier,kit_name,total_lp,categories,tested_at,tier_lp,updated_at)
   VALUES(pid,item->>'kit',item->>'tier',item->>'kitName',(item->>'totalLp')::integer,item->'categories',(item->>'testedAt')::bigint,
   CASE WHEN item->>'tier' IN ('LT3','HT4','LT4','HT5','LT5') THEN (item->>'totalLp')::integer ELSE NULL END,now())
  ON CONFLICT(player_id,kit) DO UPDATE SET tier=excluded.tier,kit_name=excluded.kit_name,total_lp=excluded.total_lp,categories=excluded.categories,tested_at=excluded.tested_at,tier_lp=excluded.tier_lp,updated_at=excluded.updated_at;
  INSERT INTO public.tier_sync_metadata(player_id,kit,discord_id,tester_id,guild_id) VALUES(pid,item->>'kit',item->>'discordId',item->>'testerId',item->>'guildId')
   ON CONFLICT(player_id,kit) DO UPDATE SET discord_id=excluded.discord_id,tester_id=excluded.tester_id,guild_id=excluded.guild_id;
 END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_discord_tier_sync(jsonb), public.populate_tier_username(), public.refresh_tier_username() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_discord_tier_sync(jsonb) TO service_role;