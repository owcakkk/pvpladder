import type { LadderPlayer } from "./ladder";
import type { Tables } from "@/integrations/supabase/types";

export type UsernameChange = Tables<"minecraft_username_changes">;
const uuidKey = (uuid: string) => uuid.replaceAll("-", "").toLowerCase();

export function playerForUsernameChange(change: UsernameChange, players: LadderPlayer[]) {
  // A ladder event retains its exact original row even if duplicate UUIDs exist.
  if (change.source_table === "players") return players.find((p) => p.id === change.source_id);
  return players.find((p) => p.mc_uuid && uuidKey(p.mc_uuid) === uuidKey(change.mc_uuid));
}