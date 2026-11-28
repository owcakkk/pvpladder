// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Runs the real Subtiers SQL scripts (the ones you paste into the SQL editor) against an in-memory database.
let db: PGlite;
const row = { username: "Example", kit: "speed", kitName: "Speed", tier: "LT3", totalLp: 375, categories: { Gamesense: 90 }, testedAt: 1000, discordId: "123", uuid: "a".repeat(32) };
const apply = (players: unknown[]) => db.query("SELECT apply_sub_tier_sync($1::jsonb)", [JSON.stringify(players)]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;");
  await db.exec(readFileSync("docs/sql/subtiers_setup.sql", "utf8"));
  await db.exec(readFileSync("docs/sql/subtiers_bot_sync.sql", "utf8"));
}, 30000);
afterAll(async () => { await db?.close(); });

describe("Subtiers bot sync (database)", () => {
  it("creates the player and tier on the first result", async () => {
    await apply([row]);
    const tiers = await db.query<{ username: string; kit: string; tier: string; total_lp: number; tier_lp: number }>("SELECT username,kit,tier,total_lp,tier_lp FROM sub_player_tiers");
    expect(tiers.rows).toEqual([{ username: "Example", kit: "speed", tier: "LT3", total_lp: 375, tier_lp: 375 }]);
    expect((await db.query("SELECT id FROM sub_players")).rows).toHaveLength(1);
  });
  it("updates by case-insensitive username without creating a second player", async () => {
    await apply([{ ...row, username: "EXAMPLE", testedAt: 2000, totalLp: 380 }]);
    expect((await db.query<{ total_lp: number }>("SELECT total_lp FROM sub_player_tiers")).rows[0]?.total_lp).toBe(380);
    expect((await db.query("SELECT id FROM sub_players")).rows).toHaveLength(1);
  });
  it("ignores older results and keeps Discord details private", async () => {
    await apply([{ ...row, testedAt: 1500, totalLp: 350 }]);
    expect((await db.query<{ total_lp: number }>("SELECT total_lp FROM sub_player_tiers")).rows[0]?.total_lp).toBe(380);
    expect((await db.query<{ discord_id: string }>("SELECT discord_id FROM sub_tier_sync_metadata")).rows[0]?.discord_id).toBe("123");
    const grants = await db.query<{ allowed: boolean }>("SELECT has_table_privilege('anon','sub_tier_sync_metadata','SELECT') AS allowed");
    expect(grants.rows[0]?.allowed).toBe(false);
  });
  it("stores high tiers without LP and keeps other kits separate", async () => {
    await apply([{ ...row, tier: "HT3", totalLp: null, testedAt: 3000 }, { ...row, kit: "bow", kitName: "Bow", testedAt: 3000 }]);
    const tiers = await db.query<{ kit: string; tier: string; tier_lp: number | null }>("SELECT kit,tier,tier_lp FROM sub_player_tiers ORDER BY kit");
    expect(tiers.rows).toEqual([{ kit: "bow", tier: "LT3", tier_lp: 375 }, { kit: "speed", tier: "HT3", tier_lp: null }]);
  });
  it("refuses a different Minecraft account under the same name", async () => {
    await expect(apply([{ ...row, testedAt: 9000, uuid: "b".repeat(32) }])).rejects.toThrow("Minecraft identity conflict");
  });
  it("is closed to the public: only the server can read or write", async () => {
    for (const table of ["sub_players", "sub_player_tiers"]) {
      const grants = await db.query<{ read: boolean; write: boolean }>(
        `SELECT has_table_privilege('anon','${table}','SELECT') AS read, has_table_privilege('anon','${table}','INSERT') AS write`);
      expect(grants.rows[0]).toEqual({ read: false, write: false });
    }
    const fn = await db.query<{ allowed: boolean }>("SELECT has_function_privilege('anon','apply_sub_tier_sync(jsonb)','EXECUTE') AS allowed");
    expect(fn.rows[0]?.allowed).toBe(false);
  });
});
