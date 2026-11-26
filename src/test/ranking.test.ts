import { describe, expect, it } from "vitest";
import { buildLadderPlayers } from "@/lib/ladder-build";
import { parseRankMaps, rankDelta, rankMaps } from "@/lib/ranking";

const player = (id: string, username: string) => ({ id, username, mc_uuid: null, region: "EU" });
const tier = (player_id: string, kit: string, tier: string, tier_lp: number | null = null) =>
  ({ player_id, kit, tier, bonus_points: 0, tier_lp, total_lp: null, categories: null, tested_at: null, kit_name: null });

describe("rank maps", () => {
  const ladder = buildLadderPlayers(
    [player("a", "Alpha"), player("b", "Bravo"), player("c", "Charlie")],
    [tier("a", "sword", "LT3", 350), tier("b", "sword", "HT3"), tier("c", "axe", "LT3", 360), tier("b", "axe", "LT3", 340)],
  );
  const maps = rankMaps(ladder);

  it("ranks overall by points and per kit by tier", () => {
    expect(maps.overall["b"]).toBe(1); // HT3 (600) + LT3 340
    expect(maps.kits["sword"]).toEqual({ b: 1, a: 2 });
    expect(maps.kits["axe"]).toEqual({ c: 1, b: 2 });
  });
  it("only ranks players who have a tier in the kit", () => {
    expect(maps.kits["sword"]?.["c"]).toBeUndefined();
  });
});

describe("rank change", () => {
  it("reports up, down, new and unchanged", () => {
    const before = { a: 3, b: 1, c: 2 };
    expect(rankDelta(before, "a", 1)).toEqual({ kind: "up", by: 2 });
    expect(rankDelta(before, "b", 3)).toEqual({ kind: "down", by: 2 });
    expect(rankDelta(before, "c", 2)).toBeNull();
    expect(rankDelta(before, "d", 4)).toEqual({ kind: "new", by: 0 });
  });
  it("shows nothing without a baseline", () => {
    expect(rankDelta(undefined, "a", 1)).toBeNull();
    expect(rankDelta(null, "a", 1)).toBeNull();
  });
  it("only accepts well-formed snapshots", () => {
    expect(parseRankMaps({ overall: { a: 1 }, kits: { sword: { a: 1 } } })).toEqual({ overall: { a: 1 }, kits: { sword: { a: 1 } } });
    expect(parseRankMaps({ overall: { a: "x" }, kits: {} })).toBeNull();
    expect(parseRankMaps(null)).toBeNull();
    expect(parseRankMaps({ overall: {} })).toBeNull();
  });
});
