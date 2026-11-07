import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const TABLES = ["players", "tournament_players"] as const;
type PlayerTable = (typeof TABLES)[number];
type AccountRow = { id: string; username: string; mc_uuid: string | null; username_checked_at: string | null };
const BATCH_SIZE = 24;

export function normalizeMcUUID(value: string): string | null {
  const normalized = value.replaceAll("-", "").toLowerCase();
  return /^[a-f0-9]{32}$/.test(normalized) ? normalized : null;
}

export async function officialMcName(uuid: string, request: typeof fetch = fetch): Promise<string | null> {
  const normalized = normalizeMcUUID(uuid);
  if (!normalized) return null;
  const response = await request(`https://sessionserver.mojang.com/session/minecraft/profile/${normalized}`, {
    headers: { accept: "application/json" }, signal: AbortSignal.timeout(1200),
  });
  if (!response.ok) {
    const body = await response.text();
    console.warn(`Minecraft profile lookup failed [${response.status}]: ${body}`);
    return null;
  }
  const profile: unknown = await response.json();
  if (!profile || typeof profile !== "object" || !("id" in profile) || !("name" in profile)) return null;
  if (typeof profile.id !== "string" || normalizeMcUUID(profile.id) !== normalized) return null;
  return typeof profile.name === "string" && /^[A-Za-z0-9_]{1,16}$/.test(profile.name) ? profile.name : null;
}

// Only called after the scheduled caller is authenticated. Never rewrite UUIDs,
// player IDs, tiers, tier LP, bonus points, or tournament results.
export async function refreshMcUsernames(db: SupabaseClient<Database>, request: typeof fetch = fetch) {
  const started = Date.now();
  const checkedAt = new Date(started).toISOString();
  const dueBefore = new Date(started - 60 * 60 * 1000).toISOString();
  const groups = new Map<string, Array<{ table: PlayerTable; row: AccountRow }>>();
  const candidates: Array<{ table: PlayerTable; row: AccountRow }> = [];
  for (const table of TABLES) {
    const { data, error } = await db.from(table)
      .select("id, username, mc_uuid, username_checked_at").not("mc_uuid", "is", null)
      .or(`username_checked_at.is.null,username_checked_at.lte.${dueBefore}`)
      .order("username_checked_at", { ascending: true, nullsFirst: true }).order("id")
      .limit(BATCH_SIZE);
    if (error) throw new Error(`Couldn't read username queue: ${error.message}`);
    for (const row of data ?? []) candidates.push({ table, row });
  }
  candidates.sort((a, b) => (a.row.username_checked_at ?? "").localeCompare(b.row.username_checked_at ?? ""));
  for (const candidate of candidates) {
    const uuid = normalizeMcUUID(candidate.row.mc_uuid ?? "");
    // Invalid legacy UUIDs never get resolved through a possibly recycled name.
    const key = uuid ?? `invalid:${candidate.table}:${candidate.row.id}`;
    if (!groups.has(key) && groups.size >= BATCH_SIZE) continue;
    const entries = groups.get(key) ?? [];
    entries.push(candidate);
    groups.set(key, entries);
  }
  const summary = { checked: 0, renamed: 0, failed: 0, conflicts: 0 };
  const entries = [...groups.entries()];
  // Six outbound connections maximum; bounded time and oldest-first ordering
  // keep larger rosters rotating without a long-running scheduled request.
  for (let i = 0; i < entries.length && Date.now() - started < 3000; i += 6) {
    await Promise.all(entries.slice(i, i + 6).map(async ([uuid, rows]) => {
      let name: string | null = null;
      try { name = await officialMcName(uuid, request); }
      catch (error) { console.warn("Minecraft username lookup failed", error); }
      summary.checked++;
      if (!name) summary.failed++;
      for (const { table, row } of rows) {
        const { error: checkError } = await db.from(table).update({ username_checked_at: checkedAt })
          .eq("id", row.id).eq("mc_uuid", row.mc_uuid ?? "");
        if (checkError) throw new Error(`Couldn't save username check: ${checkError.message}`);
        if (!name || name === row.username) continue;
        const { error } = await db.from(table).update({ username: name })
          .eq("id", row.id).eq("mc_uuid", row.mc_uuid ?? "");
        if (error?.code === "23505") {
          summary.conflicts++;
          console.warn(`Minecraft username conflict in ${table}; preserved player ${row.id}`);
        } else if (error) throw new Error(`Couldn't refresh username: ${error.message}`);
        else summary.renamed++;
      }
    }));
  }
  return summary;
}