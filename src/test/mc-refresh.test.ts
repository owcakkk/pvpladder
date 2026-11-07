import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { officialMcName, refreshMcUsernames } from "@/lib/mc-refresh.server";

const uuid = "069a79f444e94726a5befca90e38aaf5";
const oldPlayer = () => ({ id: "player-1", username: "OldName", mc_uuid: uuid, username_checked_at: null,
  tiers: { axe: "LT3" }, tierLP: { axe: 375 }, bonuses: { axe: 0 }, points: 375 });

function database(conflict = false) {
  const player = oldPlayer();
  const tournament = { ...oldPlayer(), id: "roster-1", wins: 7, losses: 2 };
  const updates: Array<{ table: string; values: Record<string, unknown>; filters: Record<string, unknown> }> = [];
  const db = { from: (table: string) => ({
    select: () => {
      const query = { not: () => query, or: () => query, order: () => query,
        limit: async () => ({ data: [table === "players" ? player : tournament], error: null }) };
      return query;
    },
    update: (values: Record<string, unknown>) => {
      const filters: Record<string, unknown> = {};
      const query = { eq: (key: string, value: unknown) => { filters[key] = value; return query; },
        then: (resolve: (result: unknown) => unknown) => {
          updates.push({ table, values, filters });
          if (conflict && "username" in values) return Promise.resolve(resolve({ error: { code: "23505" } }));
          Object.assign(table === "players" ? player : tournament, values);
          return Promise.resolve(resolve({ error: null }));
        } };
      return query;
    },
  }) } as unknown as SupabaseClient<Database>;
  return { db, player, tournament, updates };
}

const profileRequest = (id = uuid, name = "NewName") => vi.fn<typeof fetch>()
  .mockResolvedValue(new Response(JSON.stringify({ id, name }), { status: 200 }));

describe("official Minecraft username refresh", () => {
  it("queries the official profile endpoint by normalized permanent UUID", async () => {
    const request = profileRequest();
    expect(await officialMcName("069a79f4-44e9-4726-a5be-fca90e38aaf5", request)).toBe("NewName");
    expect(request.mock.calls[0]?.[0]).toBe(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
  });

  it("renames existing UUID rows while preserving IDs, tiers, LP and tournament results", async () => {
    const { db, player, tournament, updates } = database();
    const request = profileRequest();
    expect(await refreshMcUsernames(db, request)).toEqual({ checked: 1, renamed: 2, failed: 0, conflicts: 0 });
    expect(request).toHaveBeenCalledTimes(1);
    expect(player).toMatchObject({ id: "player-1", username: "NewName", mc_uuid: uuid,
      tiers: { axe: "LT3" }, tierLP: { axe: 375 }, bonuses: { axe: 0 }, points: 375 });
    expect(tournament).toMatchObject({ id: "roster-1", username: "NewName", wins: 7, losses: 2 });
    for (const update of updates) {
      expect(update.filters["mc_uuid"]).toBe(uuid);
      expect(Object.keys(update.values)).toEqual(["username" in update.values ? "username" : "username_checked_at"]);
    }
  });

  it("rejects profiles for a different UUID and retains the saved name and LP", async () => {
    const { db, player } = database();
    await refreshMcUsernames(db, profileRequest("00000000000000000000000000000000"));
    expect(player.username).toBe("OldName");
    expect(player.points).toBe(375);
  });

  it("retains the account on rate limiting and records the attempt for later retry", async () => {
    const { db, player } = database();
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("Rate limited", { status: 429 }));
    expect(await refreshMcUsernames(db, request)).toMatchObject({ failed: 1, renamed: 0 });
    expect(player.username).toBe("OldName");
    expect(player.username_checked_at).toEqual(expect.any(String));
  });

  it("preserves both identity and points on a username uniqueness conflict", async () => {
    const { db, player } = database(true);
    expect(await refreshMcUsernames(db, profileRequest())).toMatchObject({ conflicts: 2, renamed: 0 });
    expect(player).toMatchObject({ id: "player-1", username: "OldName", mc_uuid: uuid, points: 375 });
  });

  it("does not query invalid UUIDs or accept invalid usernames", async () => {
    const request = profileRequest(uuid, "invalid name");
    expect(await officialMcName("invalid", request)).toBeNull();
    expect(request).not.toHaveBeenCalled();
    expect(await officialMcName(uuid, request)).toBeNull();
  });
});