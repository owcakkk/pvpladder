import { createHmac, timingSafeEqual } from "node:crypto";
import { SYNC_WINDOW_MS, SyncPayloadError, syncPlayers } from "./tier-sync";
import type { Json } from "@/integrations/supabase/types";
import { lookupMcPlayer } from "./mc-lookup.server";
import { recordTierHistory } from "./tier-history.server";

export function verifySyncSignature(raw: string, timestamp: string | null, signature: string | null, secret: string, now = Date.now()) {
  if (!timestamp || !/^\d{1,16}$/.test(timestamp) || !signature || !/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const time = Number(timestamp);
  if (!Number.isSafeInteger(time) || Math.abs(now - time) > SYNC_WINDOW_MS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export async function handleTierSync(request: Request, secret: string | undefined) {
  if (!secret) return Response.json({ error: "Tier sync is not configured" }, { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > 1048576) return Response.json({ error: "Payload too large" }, { status: 413 });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 1048576) return Response.json({ error: "Payload too large" }, { status: 413 });
  if (!verifySyncSignature(raw, request.headers.get("x-sync-timestamp"), request.headers.get("x-sync-signature"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let players;
  try { players = syncPlayers(JSON.parse(raw)); }
  catch (error) {
    const field = error instanceof SyncPayloadError ? error.field : "body";
    return Response.json({ error: "Invalid tier payload", field }, { status: 400 });
  }
  if (players.length === 0) return Response.json({ ok: true });
  try {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: readError } = await db.from("players").select("username, mc_uuid");
    if (readError) throw new Error("Read failed");
    const resolved = new Map<string, string | null>();
    for (const player of players) {
      const row = existing?.find((entry) => entry.username.toLowerCase() === player.username.toLowerCase());
      if (row) resolved.set(player.username.toLowerCase(), row.mc_uuid);
    }
    const missing = [...new Set(players.map((player) => player.username.toLowerCase()))].filter((name) => !resolved.has(name));
    // Unknown players: resolve through lookupMcPlayer, which tries several
    // sources (Crafty, Minecraft Services, Mojang, PlayerDB) instead of one.
    const canonical = new Map<string, string>();
    const notFound: string[] = [];
    for (let i = 0; i < missing.length; i += 4) {
      await Promise.all(missing.slice(i, i + 4).map(async (name) => {
        let found: { username: string; uuid: string } | null = null;
        try { found = await lookupMcPlayer(name); } catch { found = null; }
        const uuid = found?.uuid.replaceAll("-", "").toLowerCase();
        if (!found || !uuid || !/^[a-f0-9]{32}$/.test(uuid)) { notFound.push(name); return; }
        resolved.set(name, uuid);
        canonical.set(name, found.username);
      }));
    }
    if (notFound.length > 0) {
      console.warn("Tier sync: Minecraft lookup failed for", notFound.join(", "));
      return Response.json({ error: "Minecraft player not found", usernames: notFound }, { status: 422 });
    }
    const payload = players.map((player) => ({ ...player, username: canonical.get(player.username.toLowerCase()) ?? player.username, uuid: resolved.get(player.username.toLowerCase()) ?? null }));
    const { error } = await db.rpc("apply_discord_tier_sync", { payload: payload as unknown as Json });
    if (error) throw new Error("Tier write failed");
    // The database function matches a renamed player by UUID but keeps the old
    // name, so apply the new name here (same identity, same rows, only the name).
    // Failures (e.g. the name is already taken) never fail the sync itself.
    const normalize = (value: string | null) => (value ?? "").replaceAll("-", "").toLowerCase();
    for (const player of payload) {
      const uuid = normalize(player.uuid);
      if (!uuid) continue;
      const row = existing?.find((entry) => normalize(entry.mc_uuid) === uuid && entry.username !== player.username);
      if (!row?.mc_uuid) continue;
      try {
        for (const table of ["players", "tournament_players"] as const) {
          const { error: renameError } = await db.from(table).update({ username: player.username }).eq("mc_uuid", row.mc_uuid);
          if (renameError) console.warn(`Tier sync: couldn't rename ${row.username} in ${table}`, renameError.code);
        }
      } catch (renameFailure) { console.warn("Tier sync: rename failed", renameFailure); }
    }
    // Keep a history of every synced result for the Tier Journey chart (never fails the sync).
    try {
      const { data: fresh } = await db.from("players").select("id, username");
      const idByName = new Map((fresh ?? []).map((row) => [row.username.toLowerCase(), row.id]));
      const wanted = new Set<string>();
      for (const player of payload) {
        const id = idByName.get(player.username.toLowerCase());
        if (id) wanted.add(`${id}:${player.kit}`);
      }
      const ids = [...new Set([...wanted].map((key) => key.split(":")[0]!))];
      if (ids.length > 0) {
        const { data: rows } = await db.from("player_tiers").select("player_id, kit, tier, tested_at").in("player_id", ids);
        await recordTierHistory(db, (rows ?? [])
          .filter((row) => row.tested_at != null && wanted.has(`${row.player_id}:${row.kit}`))
          .map((row) => ({ player_id: row.player_id, kit: row.kit, tier: row.tier, achieved_at: row.tested_at as number, source: "bot" as const })));
      }
    } catch (historyError) { console.warn("Tier sync: history step failed", historyError); }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unable to sync tiers; retry later" }, { status: 503 });
  }
}