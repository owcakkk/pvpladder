import { createHmac, timingSafeEqual } from "node:crypto";
import { SYNC_WINDOW_MS, syncPlayers } from "./tier-sync";
import type { Json } from "@/integrations/supabase/types";

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
  catch { return Response.json({ error: "Invalid tier payload" }, { status: 400 }); }
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
    for (let i = 0; i < missing.length; i += 6) {
      await Promise.all(missing.slice(i, i + 6).map(async (name) => {
        const response = await fetch(`https://api.minecraftservices.com/minecraft/profile/lookup/name/${name}`, { signal: AbortSignal.timeout(2500) });
        if (!response.ok) throw new Error("Minecraft identity lookup failed");
        const identity = await response.json() as { id?: string };
        if (!identity.id || !/^[a-fA-F0-9]{32}$/.test(identity.id)) throw new Error("Invalid Minecraft identity");
        resolved.set(name, identity.id);
      }));
    }
    const payload = players.map((player) => ({ ...player, uuid: resolved.get(player.username.toLowerCase()) ?? null }));
    const { error } = await db.rpc("apply_discord_tier_sync", { payload: payload as unknown as Json });
    if (error) throw new Error("Tier write failed");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Unable to sync tiers; retry later" }, { status: 503 });
  }
}