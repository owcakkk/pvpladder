import { describe, expect, it } from "vitest";
import { playerForUsernameChange, type UsernameChange } from "@/lib/username-history";
import type { LadderPlayer } from "@/lib/ladder";

const player: LadderPlayer = { id: "stable-id", username: "NewName", mc_uuid: "d9c78d18634745f3bd19e5d50678287d", region: "EU", tiers: { axe: "LT3" }, tierLP: { axe: 375 }, bonuses: {}, points: 375 };
const change: UsernameChange = { id: "event", source_table: "players", source_id: player.id, mc_uuid: player.mc_uuid ?? "", old_username: "OldName", new_username: "NewName", changed_at: "2026-11-08T12:00:00Z" };

describe("username history identity", () => {
  it("keeps ladder history on the original player with their current tiers and LP", () => {
    expect(playerForUsernameChange(change, [{ ...player, id: "duplicate" }, player])).toBe(player);
    expect(playerForUsernameChange(change, [player])?.tierLP["axe"]).toBe(375);
  });
  it("matches tournament history by UUID despite differing row IDs and names", () => {
    expect(playerForUsernameChange({ ...change, source_table: "tournament_players", source_id: "roster", mc_uuid: "d9c78d18-6347-45f3-bd19-e5d50678287d" }, [player])).toBe(player);
  });
  it("never matches a recycled username belonging to another UUID", () => {
    expect(playerForUsernameChange({ ...change, source_table: "tournament_players" }, [{ ...player, mc_uuid: "00000000000000000000000000000000" }])).toBeUndefined();
  });
});