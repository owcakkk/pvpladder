import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TournamentPlayer = {
  id: string;
  username: string;
  mc_uuid: string | null;
  wins: number;
  losses: number;
  ladder_player_id?: string | null;
};

export type TournamentSummary = { id: string; title: string; kit?: string | null };

export type Tournament = TournamentSummary & { players: TournamentPlayer[] };

export const ratio = (p: Pick<TournamentPlayer, "wins" | "losses">) => p.wins - p.losses;

export const sortByRatio = (players: TournamentPlayer[]) =>
  [...players].sort((a, b) => ratio(b) - ratio(a) || b.wins - a.wins || a.username.localeCompare(b.username));

export const tournamentsQuery = queryOptions({
  queryKey: ["tournaments"],
  queryFn: async (): Promise<TournamentSummary[]> => {
    const { data, error } = await supabase
      .from("tournaments").select("id, title, kit").order("created_at", { ascending: false });
    if (error) throw new Error("Couldn't load tournaments");
    return data ?? [];
  },
});

export const tournamentQuery = (id: string) => queryOptions({
  queryKey: ["tournament", id],
  queryFn: async (): Promise<Tournament | null> => {
    const { data: t, error } = await supabase
      .from("tournaments").select("id, title, kit").eq("id", id).maybeSingle();
    if (error) throw new Error("Couldn't load tournament");
    if (!t) return null;
    const { data: players, error: playersError } = await supabase
      .from("tournament_players").select("id, username, mc_uuid, wins, losses, ladder_player_id").eq("tournament_id", t.id);
    if (playersError) throw new Error("Couldn't load tournament players");
    return { id: t.id, title: t.title, kit: t.kit, players: players ?? [] };
  },
});
