CREATE TABLE public.minecraft_username_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_table text NOT NULL CHECK (source_table IN ('players','tournament_players')),
 source_id uuid NOT NULL,
 mc_uuid text NOT NULL,
 old_username text NOT NULL,
 new_username text NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.minecraft_username_changes TO service_role;
ALTER TABLE public.minecraft_username_changes ENABLE ROW LEVEL SECURITY;
CREATE INDEX minecraft_username_changes_recent ON public.minecraft_username_changes (changed_at DESC, id DESC);
CREATE FUNCTION public.record_minecraft_username_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF OLD.username IS DISTINCT FROM NEW.username AND NEW.mc_uuid IS NOT NULL AND OLD.mc_uuid IS NOT DISTINCT FROM NEW.mc_uuid THEN
  INSERT INTO public.minecraft_username_changes (source_table, source_id, mc_uuid, old_username, new_username)
  VALUES (TG_TABLE_NAME, NEW.id, NEW.mc_uuid, OLD.username, NEW.username);
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_minecraft_username_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_ladder_username_change AFTER UPDATE OF username ON public.players FOR EACH ROW EXECUTE FUNCTION public.record_minecraft_username_change();
CREATE TRIGGER record_tournament_username_change AFTER UPDATE OF username ON public.tournament_players FOR EACH ROW EXECUTE FUNCTION public.record_minecraft_username_change();
COMMENT ON TABLE public.minecraft_username_changes IS 'Staff-only append-only username history, recorded atomically with account-preserving renames. No public read policy.';