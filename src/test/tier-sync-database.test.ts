// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let db: PGlite;
const base = `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE players(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text UNIQUE NOT NULL, mc_uuid text, region text DEFAULT 'EU');
CREATE TABLE player_tiers(player_id uuid REFERENCES players(id) ON DELETE CASCADE, kit text, tier text, bonus_points integer DEFAULT 0, tier_lp integer, updated_at timestamptz DEFAULT now(), PRIMARY KEY(player_id,kit));
CREATE TABLE tournaments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text);
CREATE TABLE tournament_players(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE, username text, mc_uuid text, wins integer DEFAULT 0, losses integer DEFAULT 0, UNIQUE(tournament_id,username));`;
const row = { username: "Example", kit: "axe", kitName: "Axe", tier: "LT3", totalLp: 375, categories: { aim: 90 }, testedAt: 1000, discordId: "123", uuid: "a".repeat(32) };
const apply = (players: unknown[]) => db.query("SELECT apply_discord_tier_sync($1::jsonb)", [JSON.stringify(players)]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(base);
  await db.exec(readFileSync("drizzle/migrations/0007_tournament_kit_auto_rosters.sql", "utf8"));
  await db.exec(readFileSync("drizzle/migrations/0008_discord_tier_sync.sql", "utf8"));
}, 30000);
afterAll(async () => { await db?.close(); });

describe("Atomic bot updates and tournament eligibility", () => {
  it("upserts by case-insensitive username and kit without duplicating identity", async () => {
    await apply([row]);
    await apply([{ ...row, username: "EXAMPLE", testedAt: 2000, totalLp: 380 }]);
    const result = await db.query<{ username: string; total_lp: number }>("SELECT username,total_lp FROM player_tiers");
    expect(result.rows).toEqual([{ username: "Example", total_lp: 380 }]);
    expect((await db.query("SELECT id FROM players")).rows).toHaveLength(1);
  });
  it("ignores stale results and preserves private Discord data outside public tier rows", async () => {
    await apply([{ ...row, testedAt: 1500, totalLp: 350 }]);
    expect((await db.query<{ total_lp: number }>("SELECT total_lp FROM player_tiers")).rows[0]?.total_lp).toBe(380);
    expect((await db.query<{ discord_id: string }>("SELECT discord_id FROM tier_sync_metadata")).rows[0]?.discord_id).toBe("123");
    const grants = await db.query<{ allowed: boolean }>("SELECT has_table_privilege('anon','tier_sync_metadata','SELECT') AS allowed");
    expect(grants.rows[0]?.allowed).toBe(false);
  });
  it("automatically adds exact LT3 entrants for the selected kit and removes deranked entrants", async () => {
    await db.exec("INSERT INTO tournaments(title,kit) VALUES('Axe Cup','axe')");
    expect((await db.query("SELECT id FROM tournament_players")).rows).toHaveLength(1);
    await apply([{ ...row, tier: "HT4", totalLp: 320, testedAt: 3000 }]);
    expect((await db.query("SELECT id FROM tournament_players")).rows).toHaveLength(0);
  });
  it("keeps promoted entrants and their match records", async () => {
    await apply([{ ...row, testedAt: 4000 }]);
    await db.exec("UPDATE tournament_players SET wins=7,losses=2");
    await apply([{ ...row, tier: "HT3", totalLp: null, testedAt: 5000 }]);
    expect((await db.query("SELECT wins,losses FROM tournament_players")).rows).toEqual([{ wins: 7, losses: 2 }]);
    expect((await db.query<{ total_lp: number | null }>("SELECT total_lp FROM player_tiers")).rows[0]?.total_lp).toBeNull();
  });
  it("stops automatic registration at exactly ten players", async () => {
    await apply(Array.from({ length: 12 }, (_, i) => ({ ...row, username: `Eligible${i}`, uuid: String(i).padStart(32,"0"), testedAt: 6000 })));
    expect((await db.query("SELECT id FROM tournament_players")).rows).toHaveLength(10);
    await expect(db.exec("INSERT INTO tournament_players(tournament_id,username) SELECT id,'Overflow' FROM tournaments LIMIT 1")).rejects.toThrow("Tournament is full");
  });
});