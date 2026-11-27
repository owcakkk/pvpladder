import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, type Tier } from "./kits";

export type HistoryRow = { player_id: string; kit: string; tier: Tier; achieved_at: number; source: string };
export type RecentResult = { playerId: string; kit: string; tier: Tier; previousTier: Tier | null; achievedAt: number; source: string };

// Newest recorded results of all players (from the tier_history table), newest first.
// Returns [] when the table doesn't exist or the request fails, so the strip simply hides.
export const recentHistoryQuery = queryOptions({
  queryKey: ["tier-history", "recent"],
  staleTime: 30 * 1000,
  refetchInterval: 60 * 1000,
  queryFn: async (): Promise<HistoryRow[]> => {
    try {
      const table = (supabase as unknown as { from: (name: string) => any }).from.bind(supabase) as (name: string) => any;
      const { data, error } = await table("tier_history").select("player_id, kit, tier, achieved_at, source")
        .order("achieved_at", { ascending: false }).limit(400);
      if (error || !Array.isArray(data)) return [];
      return data
        .filter((row: { tier: string; achieved_at: unknown }) => (TIERS as readonly string[]).includes(row.tier) && Number.isFinite(Number(row.achieved_at)))
        .map((row: { player_id: string; kit: string; tier: Tier; achieved_at: number | string; source?: string }) =>
          ({ player_id: row.player_id, kit: row.kit, tier: row.tier, achieved_at: Number(row.achieved_at), source: row.source ?? "bot" }));
    } catch { return []; }
  },
});

// Picks the newest `limit` results (optionally for one kit) and finds the tier each player
// had in that kit just before, so a change can be shown as "LT3 -> HT3".
// `rows` must be sorted newest first. Players not in `knownPlayers` (deleted) are skipped.
export function buildRecentResults(rows: HistoryRow[], knownPlayers: Set<string>, limit: number, kit?: string): RecentResult[] {
  const results: RecentResult[] = [];
  for (let i = 0; i < rows.length && results.length < limit; i++) {
    const row = rows[i]!;
    if ((kit && row.kit !== kit) || !knownPlayers.has(row.player_id)) continue;
    const earlier = rows.slice(i + 1).find((other) => other.player_id === row.player_id && other.kit === row.kit);
    results.push({ playerId: row.player_id, kit: row.kit, tier: row.tier, previousTier: earlier?.tier ?? null, achievedAt: row.achieved_at, source: row.source });
  }
  return results;
}

export function timeAgo(ms: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - ms) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return new Date(ms).toLocaleDateString("en-GB", { timeZone: "UTC" });
}
