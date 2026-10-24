import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TournamentPlayer = {
  id: string;
  username: string;
  mc_uuid: string | null;
  wins: number;
  losses: number;
};

export type Tournament = {
  id: string;
  title: string;
  players: TournamentPlayer[];
};

export const ratio = (p: Pick<TournamentPlayer, "wins" | "losses">) => p.wins - p.losses;

export const sortByRatio = (players: TournamentPlayer[]) =>
  [...players].sort((a, b) => ratio(b) - ratio(a) || b.wins - a.wins || a.username.localeCompare(b.username));

export const tournamentQuery = queryOptions({
  queryKey: ["tournament"],
  queryFn: async (): Promise<Tournament | null> => {
    const { data: t } = await supabase
      .from("tournaments").select("id, title").order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (!t) return null;
    const { data: players } = await supabase
      .from("tournament_players").select("id, username, mc_uuid, wins, losses").eq("tournament_id", t.id);
    return { id: t.id, title: t.title, players: players ?? [] };
  },
});
