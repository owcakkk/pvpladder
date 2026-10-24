import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TournamentPlayer = {
  id: string;
  username: string;
  mc_uuid: string | null;
  wins: number;
  losses: number;
};

export type TournamentSummary = { id: string; title: string };

export type Tournament = TournamentSummary & { players: TournamentPlayer[] };

export const ratio = (p: Pick<TournamentPlayer, "wins" | "losses">) => p.wins - p.losses;

export const sortByRatio = (players: TournamentPlayer[]) =>
  [...players].sort((a, b) => ratio(b) - ratio(a) || b.wins - a.wins || a.username.localeCompare(b.username));

export const tournamentsQuery = queryOptions({
  queryKey: ["tournaments"],
  queryFn: async (): Promise<TournamentSummary[]> => {
    const { data } = await supabase
      .from("tournaments").select("id, title").order("created_at", { ascending: false });
    return data ?? [];
  },
});

export const tournamentQuery = (id: string) => queryOptions({
  queryKey: ["tournament", id],
  queryFn: async (): Promise<Tournament | null> => {
    const { data: t } = await supabase
      .from("tournaments").select("id, title").eq("id", id).maybeSingle();
    if (!t) return null;
    const { data: players } = await supabase
      .from("tournament_players").select("id, username, mc_uuid, wins, losses").eq("tournament_id", t.id);
    return { id: t.id, title: t.title, players: players ?? [] };
  },
});
