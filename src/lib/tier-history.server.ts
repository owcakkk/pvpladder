import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type TierHistoryRow = { player_id: string; kit: string; tier: string; achieved_at: number; source: "bot" | "staff" };

// Saves tier results for the "Tier Journey" chart. Re-saving the same result is ignored.
// Never throws: history is a bonus and must not break a sync or a staff edit
// (for example if the tier_history table hasn't been created yet).
export async function recordTierHistory(db: SupabaseClient<Database>, rows: TierHistoryRow[]): Promise<void> {
  if (rows.length === 0) return;
  try {
    const table = (db as unknown as { from: (name: string) => any }).from.bind(db) as (name: string) => any;
    const { error } = await table("tier_history").upsert(rows, { onConflict: "player_id,kit,achieved_at", ignoreDuplicates: true });
    if (error) console.warn("Tier history not saved:", error.code, error.message);
  } catch (error) {
    console.warn("Tier history not saved:", error);
  }
}
