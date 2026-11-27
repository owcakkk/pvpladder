import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildLadderPlayers, type LadderPlayer } from "./ladder-build";
import { getSubLadderRows, subAccess } from "./staff.functions";
import { parseRankMaps, type RankMaps } from "./ranking";
import type { LadderConfig } from "./ladders";
export { computePoints } from "./kits";
export type { LadderPlayer } from "./ladder-build";

export const ladderQuery = queryOptions({
  queryKey: ["ladder"],
  queryFn: async (): Promise<LadderPlayer[]> => {
    const [{ data: players, error }, { data: tiers, error: e2 }] = await Promise.all([
      supabase.from("players").select("id, username, mc_uuid, region"),
      supabase.from("player_tiers").select("player_id, kit, tier, bonus_points, tier_lp, total_lp, categories, tested_at, kit_name"),
    ]);
    if (error) throw error;
    if (e2) throw e2;
    return buildLadderPlayers(players ?? [], tiers ?? []);
  },
});

// Subtiers ladder: same shape of data, but only ever fetched through the server, which
// checks that the ladder is unlocked or the visitor is staff.
export const subLadderQuery = queryOptions({
  queryKey: ["ladder", "sub"],
  queryFn: async (): Promise<LadderPlayer[]> => {
    const { players, tiers } = await getSubLadderRows();
    return buildLadderPlayers(players, tiers);
  },
});

// Is the Subtiers ladder open to this visitor? (Shares the ["staff"] key so logging in or
// out in the staff panel refreshes it.)
export const subAccessQuery = queryOptions({
  queryKey: ["staff", "sub-access"],
  staleTime: 30 * 1000,
  queryFn: () => subAccess(),
});

export const ladderQueryOf = (ladder: LadderConfig) => (ladder.id === "sub" ? subLadderQuery : ladderQuery);

// Ranks from the newest daily snapshot that is at least ~20 hours old, used for the
// rank-change arrows. Returns null (no arrows) if the table or a snapshot doesn't exist yet.
export const rankBaselineQuery = queryOptions({
  queryKey: ["rank-baseline"],
  staleTime: 5 * 60 * 1000,
  queryFn: async (): Promise<RankMaps | null> => {
    try {
      const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
      const snapshots = (supabase as unknown as { from: (table: string) => any }).from.bind(supabase) as (table: string) => any;
      const { data, error } = await snapshots("rank_snapshots").select("ranks").lte("taken_at", cutoff).order("taken_at", { ascending: false }).limit(1);
      if (error) return null;
      return parseRankMaps(data?.[0]?.ranks);
    } catch { return null; }
  },
});
