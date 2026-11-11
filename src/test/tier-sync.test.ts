// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { syncPlayers } from "@/lib/tier-sync";
import { handleTierSync, verifySyncSignature } from "@/lib/tier-sync.server";
import { compareTierResults } from "@/lib/kits";

const now = 1794229200000;
const secret = "isolated-test-fixture-not-a-project-secret";
const player = { username: "Example", kit: "axe", kitName: "Axe", tier: "LT3", totalLp: 375, categories: { aim: 90 }, testedAt: now, discordId: "123456" };
const db = vi.hoisted(() => ({ rpc: vi.fn(async () => ({ error: null })), from: vi.fn(() => ({ select: async () => ({ data: [{ username: "Example", mc_uuid: "a".repeat(32) }], error: null }) })) }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));
const sign = (raw: string, time = String(now)) => createHmac("sha256", secret).update(`${time}.${raw}`).digest("hex");

describe("Discord tier synchronization", () => {
  it("accepts the exact timestamp and raw-body HMAC", () => {
    const raw = '{ "event": "result" }';
    expect(verifySyncSignature(raw, String(now), sign(raw), secret, now)).toBe(true);
    expect(verifySyncSignature(raw.trim() + " ", String(now), sign(raw), secret, now)).toBe(false);
  });
  it("rejects signatures with bad hex or the wrong HMAC", () => {
    expect(verifySyncSignature("{}", String(now), "z".repeat(64), secret, now)).toBe(false);
    expect(verifySyncSignature("{}", String(now), "0".repeat(64), secret, now)).toBe(false);
  });
  it("rejects timestamps older than five minutes and far-future timestamps", () => {
    for (const time of [now - 300001, now + 300001]) expect(verifySyncSignature("{}", String(time), sign("{}", String(time)), secret, now)).toBe(false);
    expect(verifySyncSignature("{}", String(now - 300000), sign("{}", String(now - 300000)), secret, now)).toBe(true);
  });
  it("validates result and nullable highresult LP", () => {
    expect(syncPlayers({ event: "result", ...player }, now)[0]?.totalLp).toBe(375);
    expect(syncPlayers({ event: "highresult", ...player, tier: "HT1", totalLp: null }, now)[0]?.totalLp).toBeNull();
    expect(() => syncPlayers({ event: "result", ...player, tier: "invalid" }, now)).toThrow();
  });
  it("accepts a snapshot and keeps the newest case-insensitive player-kit result", () => {
    const rows = syncPlayers({ event: "snapshot", players: [player, { ...player, username: "EXAMPLE", testedAt: now + 1, totalLp: 380 }], batch: 0, batches: 1 }, now);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.totalLp).toBe(380);
  });
  it("sorts HT1 first and LT5 last, then descending LP within a tier", () => {
    const results = [{ tier: "LT5", lp: 99 }, { tier: "LT3", lp: 350 }, { tier: "HT1", lp: null }, { tier: "LT3", lp: 400 }].sort(compareTierResults);
    expect(results.map((row) => row.lp)).toEqual([null, 400, 350, 99]);
  });
  it("returns 401 before any database write for an invalid signature", async () => {
    db.rpc.mockClear();
    const response = await handleTierSync(new Request("https://example.test", { method: "POST", body: "{}" }), secret);
    expect(response.status).toBe(401);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("writes a signed valid result through the atomic RPC and returns 200", async () => {
    const time = String(Date.now());
    const raw = JSON.stringify({ event: "result", ...player });
    const response = await handleTierSync(new Request("https://example.test", { method: "POST", body: raw, headers: { "x-sync-timestamp": time, "x-sync-signature": sign(raw, time) } }), secret);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(db.rpc).toHaveBeenCalledWith("apply_discord_tier_sync", { payload: [expect.objectContaining({ tier: "LT3", totalLp: 375, uuid: "a".repeat(32) })] });
  });
});
describe("Bot payload shapes", () => {
  const steve = { username: "Steve", kit: "sword", kitName: "Sword", tier: "HT4", totalLp: 310, categories: { Gamesense: 90 }, testedAt: 1762860000000, discordId: "987654321" };
  it("accepts the documented result body", () => {
    expect(syncPlayers({ event: "result", guildId: "123", ...steve, previousTier: "LT4", previousLp: 260, region: "EU", testerId: "555" }, now)).toHaveLength(1);
  });
  it("accepts highresult without LP or categories, and minimal fields", () => {
    expect(syncPlayers({ event: "highresult", username: "Steve", kit: "sword", kitName: "Sword", tier: "HT2" }, now)).toHaveLength(1);
  });
  it("accepts snapshot with top-level guildId and empty players", () => {
    expect(syncPlayers({ event: "snapshot", guildId: "123", batch: 1, batches: 1, players: [steve] }, now)[0]?.guildId).toBe("123");
    expect(syncPlayers({ event: "snapshot", players: [] }, now)).toEqual([]);
  });
  it("reports the failing field", () => {
    try { syncPlayers({ event: "snapshot", players: [{ ...steve, tier: "XX" }] }, now); throw new Error("no"); }
    catch (e) { expect((e as { field: string }).field).toBe("players[0].tier"); }
  });
});
