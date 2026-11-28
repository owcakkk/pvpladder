// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { syncPlayers } from "@/lib/tier-sync";
import { handleTierSync } from "@/lib/tier-sync.server";
import { SUB_KITS } from "@/lib/ladders";

const secret = "isolated-test-fixture-not-a-project-secret";
const player = { username: "Example", kit: "diamondvanilla", kitName: "DiamondVanilla", tier: "LT3", totalLp: 375, categories: { Gamesense: 90 }, testedAt: Date.now(), discordId: "123456" };
const db = vi.hoisted(() => {
  const tables: string[] = [];
  return {
    tables,
    rpc: vi.fn(async () => ({ error: null })),
    from: vi.fn((table: string) => { tables.push(table); return { select: async () => ({ data: [{ username: "Example", mc_uuid: "a".repeat(32) }], error: null }) }; }),
  };
});
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));

const post = (body: unknown, ladder: "pvp" | "sub") => {
  const raw = JSON.stringify(body);
  const time = String(Date.now());
  const signature = createHmac("sha256", secret).update(`${time}.${raw}`).digest("hex");
  return handleTierSync(new Request("https://example.test", { method: "POST", body: raw, headers: { "x-sync-timestamp": time, "x-sync-signature": signature } }), secret, ladder);
};

describe("Subtiers tier synchronization", () => {
  it("accepts every Subtiers kit id the bot sends and rejects PvP-only kits", () => {
    for (const kit of SUB_KITS) expect(syncPlayers({ event: "result", ...player, kit: kit.id }, Date.now(), SUB_KITS)).toHaveLength(1);
    expect(() => syncPlayers({ event: "result", ...player, kit: "sword" }, Date.now(), SUB_KITS)).toThrow();
    expect(syncPlayers({ event: "result", ...player, kit: "speed" }, Date.now(), SUB_KITS)).toHaveLength(1);
  });
  it("writes a signed Subtiers result to the Subtiers tables through its own function", async () => {
    db.rpc.mockClear(); db.tables.length = 0;
    const response = await post({ event: "result", ...player }, "sub");
    expect(response.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("apply_sub_tier_sync", expect.anything());
    expect(db.tables).toContain("sub_players");
    expect(db.tables).not.toContain("players");
    expect(db.tables).not.toContain("tier_history");
  });
  it("rejects a PvP kit sent to the Subtiers endpoint with 400 and no database write", async () => {
    db.rpc.mockClear();
    const response = await post({ event: "result", ...player, kit: "sword" }, "sub");
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ field: "kit" });
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("still sends PvP results to the PvP function", async () => {
    db.rpc.mockClear();
    const response = await post({ event: "result", ...player, kit: "axe", kitName: "Axe" }, "pvp");
    expect(response.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("apply_discord_tier_sync", expect.anything());
  });
});
