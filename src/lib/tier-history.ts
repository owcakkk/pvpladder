import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, type Tier } from "./kits";

export type TierHistoryPoint = { tier: Tier; achievedAt: number; source: string };

// All recorded results of one player in one kit, oldest first. Returns [] when the
// tier_history table doesn't exist yet or the request fails.
export const tierHistoryQuery = (playerId: string, kit: string) => queryOptions({
  queryKey: ["tier-history", playerId, kit],
  staleTime: 60 * 1000,
  queryFn: async (): Promise<TierHistoryPoint[]> => {
    try {
      const table = (supabase as unknown as { from: (name: string) => any }).from.bind(supabase) as (name: string) => any;
      const { data, error } = await table("tier_history").select("tier, achieved_at, source")
        .eq("player_id", playerId).eq("kit", kit).order("achieved_at", { ascending: true });
      if (error || !Array.isArray(data)) return [];
      return data
        .filter((row: { tier: string; achieved_at: unknown }) => (TIERS as readonly string[]).includes(row.tier) && Number.isFinite(Number(row.achieved_at)))
        .map((row: { tier: Tier; achieved_at: number | string; source?: string }) => ({ tier: row.tier, achievedAt: Number(row.achieved_at), source: row.source ?? "bot" }));
    } catch { return []; }
  },
});

// Highest tier ever reached, the latest tier and the number of recorded results.
export function journeyStats(points: TierHistoryPoint[]): { peak: Tier | null; current: Tier | null; count: number } {
  if (points.length === 0) return { peak: null, current: null, count: 0 };
  const peak = points.reduce((best, p) => (TIERS.indexOf(p.tier) < TIERS.indexOf(best) ? p.tier : best), points[0]!.tier);
  return { peak, current: points[points.length - 1]!.tier, count: points.length };
}
