import { describe, expect, it } from "vitest";
import { buildLadderPlayers } from "@/lib/ladder-build";
import { regionCounts, tierDistribution } from "@/lib/stats";

const player = (id: string, region = "EU") => ({ id, username: id, mc_uuid: null, region });
const tier = (player_id: string, kit: string, tier: string) =>
  ({ player_id, kit, tier, bonus_points: 0, tier_lp: null, total_lp: null, categories: null, tested_at: null, kit_name: null });

describe("stats", () => {
  const ladder = buildLadderPlayers(
    [player("a"), player("b"), player("c", "NA")],
    [tier("a", "sword", "HT3"), tier("b", "sword", "HT3"), tier("c", "sword", "LT3"), tier("a", "axe", "LT5")],
  );
  it("counts players per tier in each kit", () => {
    const d = tierDistribution(ladder);
    expect(d.byKit["sword"]).toMatchObject({ HT3: 2, LT3: 1, HT1: 0 });
    expect(d.kitTotals["sword"]).toBe(3);
    expect(d.kitTotals["axe"]).toBe(1);
    expect(d.tierTotals["HT3"]).toBe(2);
  });
  it("counts regions, largest first", () => {
    expect(regionCounts(ladder)).toEqual([["EU", 2], ["NA", 1]]);
  });
});
