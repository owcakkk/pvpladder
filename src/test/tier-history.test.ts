import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { journeyStats, type TierHistoryPoint } from "@/lib/tier-history";
import { recordTierHistory } from "@/lib/tier-history.server";

const point = (tier: TierHistoryPoint["tier"], achievedAt: number): TierHistoryPoint => ({ tier, achievedAt, source: "bot" });
const row = { player_id: "p1", kit: "sword", tier: "LT3", achieved_at: 1, source: "bot" as const };

describe("journeyStats", () => {
  it("finds the peak, the current tier and the result count", () => {
    expect(journeyStats([point("LT3", 1), point("HT3", 2), point("LT2", 3), point("LT3", 4)])).toEqual({ peak: "LT2", current: "LT3", count: 4 });
  });
  it("handles an empty history", () => {
    expect(journeyStats([])).toEqual({ peak: null, current: null, count: 0 });
  });
});

describe("recordTierHistory", () => {
  const fakeDb = (result: unknown) => {
    const upsert = vi.fn().mockImplementation(() => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)));
    return { db: { from: vi.fn(() => ({ upsert })) } as unknown as SupabaseClient<Database>, upsert };
  };
  it("upserts rows and ignores duplicates", async () => {
    const { db, upsert } = fakeDb({ error: null });
    await recordTierHistory(db, [row]);
    expect(upsert).toHaveBeenCalledWith([row], { onConflict: "player_id,kit,achieved_at", ignoreDuplicates: true });
  });
  it("does nothing for an empty list", async () => {
    const { db, upsert } = fakeDb({ error: null });
    await recordTierHistory(db, []);
    expect(upsert).not.toHaveBeenCalled();
  });
  it("never throws, even if the table is missing", async () => {
    await expect(recordTierHistory(fakeDb({ error: { code: "42P01", message: "missing" } }).db, [row])).resolves.toBeUndefined();
    await expect(recordTierHistory(fakeDb(new Error("network")).db, [row])).resolves.toBeUndefined();
  });
});
