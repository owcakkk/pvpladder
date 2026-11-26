import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildLadderPlayers } from "./ladder-build";
import { rankMaps } from "./ranking";

const SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const KEEP_SNAPSHOTS = 30;

// Saves today's ranks (at most one snapshot per 24 hours) so the site can show
// rank-change arrows. Needs the rank_snapshots table; see rank_snapshots.sql.
export async function takeRankSnapshot(db: SupabaseClient<Database>, now = Date.now()): Promise<"created" | "skipped"> {
  // rank_snapshots isn't in the generated database types, so use an untyped handle for it.
  const snapshots = (db as unknown as { from: (table: string) => any }).from.bind(db) as (table: string) => any;
  const { data: latest, error: latestError } = await snapshots("rank_snapshots").select("taken_at").order("taken_at", { ascending: false }).limit(1);
  if (latestError) throw new Error(`Couldn't read rank snapshots: ${latestError.message}`);
  if (latest?.[0] && now - Date.parse(latest[0].taken_at) < SNAPSHOT_INTERVAL_MS) return "skipped";

  const [{ data: players, error: playersError }, { data: tiers, error: tiersError }] = await Promise.all([
    db.from("players").select("id, username, mc_uuid, region"),
    db.from("player_tiers").select("player_id, kit, tier, bonus_points, tier_lp, total_lp, categories, tested_at, kit_name"),
  ]);
  if (playersError || tiersError) throw new Error("Couldn't read the ladder for the rank snapshot");
  const ranks = rankMaps(buildLadderPlayers(players ?? [], tiers ?? []));
  if (Object.keys(ranks.overall).length === 0) return "skipped";

  const { error: insertError } = await snapshots("rank_snapshots").insert({ ranks });
  if (insertError) throw new Error(`Couldn't save rank snapshot: ${insertError.message}`);

  // Housekeeping: keep only the newest snapshots. Failures here never matter.
  try {
    const { data: old } = await snapshots("rank_snapshots").select("id").order("taken_at", { ascending: false }).range(KEEP_SNAPSHOTS, KEEP_SNAPSHOTS + 200);
    const ids = (old ?? []).map((row: { id: number }) => row.id);
    if (ids.length > 0) await snapshots("rank_snapshots").delete().in("id", ids);
  } catch { /* ignore */ }
  return "created";
}
