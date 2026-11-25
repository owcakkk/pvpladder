import { createHmac, timingSafeEqual } from "node:crypto";
import { SYNC_WINDOW_MS, SyncPayloadError, syncPlayers } from "./tier-sync";
import type { Json } from "@/integrations/supabase/types";
import { lookupMcPlayer } from "./mc-lookup.server";

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
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unable to sync tiers; retry later" }, { status: 503 });
  }
}