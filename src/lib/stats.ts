import type { LadderPlayer } from "./ladder-build";
import { KITS, TIERS } from "./kits";

export type TierDistribution = {
  byKit: Record<string, Record<string, number>>; // kit -> tier -> players
  kitTotals: Record<string, number>;             // kit -> ranked players
  tierTotals: Record<string, number>;            // tier -> entries across all kits
};

// How many players hold each tier in each kit.
export function tierDistribution(players: LadderPlayer[]): TierDistribution {
  const byKit: TierDistribution["byKit"] = {};
  const kitTotals: TierDistribution["kitTotals"] = {};
  const tierTotals: TierDistribution["tierTotals"] = Object.fromEntries(TIERS.map((t) => [t, 0]));
  for (const kit of KITS) {
    const counts: Record<string, number> = Object.fromEntries(TIERS.map((t) => [t, 0]));
    for (const p of players) {
      const tier = p.tiers[kit.id];
      if (tier && tier in counts) { counts[tier] = (counts[tier] ?? 0) + 1; tierTotals[tier] = (tierTotals[tier] ?? 0) + 1; }
    }
    byKit[kit.id] = counts;
    kitTotals[kit.id] = Object.values(counts).reduce((sum, n) => sum + n, 0);
  }
  return { byKit, kitTotals, tierTotals };
}

export function regionCounts(players: LadderPlayer[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const p of players) counts.set(p.region, (counts.get(p.region) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
