import { describe, expect, it } from "vitest";
import { bestTierRank, computePoints, DEFENCE_POINTS, kitPoints, TIER_POINTS, tierRank, type Tier } from "@/lib/kits";

describe("Ladder points", () => {
  it.each([ ["HT3", 600], ["LT2", 800], ["HT2", 1000], ["LT1", 1300], ["HT1", 1600] ] as const)
    ("awards %s exactly %i LP", (tier, points) => expect(TIER_POINTS[tier]).toBe(points));
  it("adds 50 LP for a successful defence", () => {
    expect(DEFENCE_POINTS.successful).toBe(50);
    expect(kitPoints("HT3", DEFENCE_POINTS.successful)).toBe(650);
  });
  it("subtracts 15 LP for an unsuccessful defence", () => {
    expect(DEFENCE_POINTS.unsuccessful).toBe(-15);
    expect(kitPoints("HT3", DEFENCE_POINTS.unsuccessful)).toBe(585);
  });
  it("sums each kit's base and signed additional LP", () => {
    expect(computePoints({ sword: "HT1", axe: "HT3" }, { sword: 35, axe: -15 })).toBe(2220);
  });
  it("does not count a bonus without an assigned tier", () => {
    expect(computePoints({}, { sword: 50 })).toBe(0);
  });
});

describe("Tier ordering", () => {
  it("ranks HT1 above HT3 and orders lower tiers LT3 before LT5", () => {
    expect(tierRank("HT1")).toBeLessThan(tierRank("HT3"));
    expect(tierRank("LT3")).toBeLessThan(tierRank("LT5"));
  });
  it("breaks overall LP ties by the player's best tier", () => {
    const higher: Record<string, Tier> = { sword: "HT3" };
    const lower: Record<string, Tier> = { sword: "LT5" };
    expect(bestTierRank(higher)).toBeLessThan(bestTierRank(lower));
  });
  it("sorts an unranked player after every ranked one", () => {
    expect(bestTierRank({})).toBe(tierRank(undefined));
  });
});