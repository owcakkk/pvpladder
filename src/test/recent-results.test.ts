import { describe, expect, it } from "vitest";
import { buildRecentResults, timeAgo, type HistoryRow } from "@/lib/recent-results";

const row = (player_id: string, kit: string, tier: HistoryRow["tier"], achieved_at: number): HistoryRow =>
  ({ player_id, kit, tier, achieved_at, source: "bot" });

describe("buildRecentResults", () => {
  const rows = [ // newest first
    row("a", "sword", "HT3", 500), row("b", "axe", "LT3", 400), row("a", "sword", "LT3", 300),
    row("gone", "sword", "LT5", 250), row("c", "sword", "LT4", 200),
  ];
  const known = new Set(["a", "b", "c"]);
  it("lists the newest results with the previous tier of the same player and kit", () => {
    const results = buildRecentResults(rows, known, 10);
    expect(results.map((r) => `${r.playerId}:${r.kit}:${r.tier}:${r.previousTier}`)).toEqual([
      "a:sword:HT3:LT3", "b:axe:LT3:null", "a:sword:LT3:null", "c:sword:LT4:null",
    ]);
  });
  it("skips deleted players and respects the limit", () => {
    expect(buildRecentResults(rows, known, 2)).toHaveLength(2);
    expect(buildRecentResults(rows, known, 10).some((r) => r.playerId === "gone")).toBe(false);
  });
  it("can be limited to one kit", () => {
    expect(buildRecentResults(rows, known, 10, "axe").map((r) => r.playerId)).toEqual(["b"]);
  });
});

describe("timeAgo", () => {
  const now = Date.UTC(2026, 10, 27, 12, 0, 0);
  it("formats short and long ages", () => {
    expect(timeAgo(now - 20_000, now)).toBe("just now");
    expect(timeAgo(now - 5 * 60_000, now)).toBe("5m ago");
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe("3h ago");
    expect(timeAgo(now - 2 * 86_400_000, now)).toBe("2d ago");
    expect(timeAgo(now - 21 * 86_400_000, now)).toBe("3w ago");
    expect(timeAgo(now - 90 * 86_400_000, now)).toBe("29/08/2026");
  });
});
