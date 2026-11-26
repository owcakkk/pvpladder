import type { LadderPlayer } from "./ladder-build";
import { KITS, bestTierPoints, bestTierRank, compareTierResults, kitPoints } from "./kits";

// The one place that decides the order of the ladder (used by the rankings page,
// player profiles and the daily rank snapshot).
export function sortKit(players: LadderPlayer[], kit: string): LadderPlayer[] {
  const result = (p: LadderPlayer) => ({
    tier: p.tiers[kit],
    lp: p.synced?.[kit] ? p.synced[kit].lp : kitPoints(p.tiers[kit], p.bonuses[kit] ?? 0, p.tierLP[kit]),
  });
  return players.filter((p) => p.tiers[kit])
    .sort((a, b) => compareTierResults(result(a), result(b)) || a.username.localeCompare(b.username));
}

export function sortOverall(players: LadderPlayer[]): LadderPlayer[] {
  return [...players].sort((a, b) =>
    b.points - a.points
    || bestTierRank(a.tiers) - bestTierRank(b.tiers)
    || bestTierPoints(b.tiers, b.bonuses, b.tierLP) - bestTierPoints(a.tiers, a.bonuses, a.tierLP)
    || a.username.localeCompare(b.username));
}

export type RankMaps = { overall: Record<string, number>; kits: Record<string, Record<string, number>> };

export function rankMaps(players: LadderPlayer[]): RankMaps {
  const overall: Record<string, number> = {};
  sortOverall(players).forEach((p, i) => { overall[p.id] = i + 1; });
  const kits: Record<string, Record<string, number>> = {};
  for (const kit of KITS) {
    const map: Record<string, number> = {};
    sortKit(players, kit.id).forEach((p, i) => { map[p.id] = i + 1; });
    kits[kit.id] = map;
  }
  return { overall, kits };
}

const isRankRecord = (value: unknown): value is Record<string, number> =>
  !!value && typeof value === "object" && !Array.isArray(value)
  && Object.values(value as Record<string, unknown>).every((v) => typeof v === "number");

// Validates a stored snapshot before it is trusted.
export function parseRankMaps(value: unknown): RankMaps | null {
  if (!value || typeof value !== "object") return null;
  const { overall, kits } = value as { overall?: unknown; kits?: unknown };
  if (!isRankRecord(overall) || !kits || typeof kits !== "object" || Array.isArray(kits)) return null;
  const cleanKits: Record<string, Record<string, number>> = {};
  for (const [kit, map] of Object.entries(kits as Record<string, unknown>)) if (isRankRecord(map)) cleanKits[kit] = map;
  return { overall, kits: cleanKits };
}

export type RankDelta = { kind: "up" | "down" | "new"; by: number } | null;

// Compares a player's current rank with the baseline snapshot's rank list.
// No baseline list -> no arrow. Missing from the list -> "new". Same rank -> no arrow.
export function rankDelta(baseline: Record<string, number> | undefined | null, id: string, current: number): RankDelta {
  if (!baseline) return null;
  const previous = baseline[id];
  if (previous == null) return { kind: "new", by: 0 };
  const change = previous - current;
  return change > 0 ? { kind: "up", by: change } : change < 0 ? { kind: "down", by: -change } : null;
}
