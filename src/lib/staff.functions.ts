import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { REGIONS, TIERS } from "./kits";

type StaffSession = { staff?: boolean };

const sessionConfig = () => ({
  password: process.env["SESSION_SECRET"]!,
  name: "staff-gate",
  maxAge: 60 * 60 * 24 * 7,
  cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
});

function matches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

async function requireStaff() {
  const s = await useSession<StaffSession>(sessionConfig());
  if (!s.data.staff) throw new Error("Staff password required");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const staffStatus = createServerFn({ method: "GET" }).handler(async () => {
  const s = await useSession<StaffSession>(sessionConfig());
  return { staff: !!s.data.staff };
});

export const unlockStaff = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => ({ password: String(d.password ?? "") }))
  .handler(async ({ data }) => {
    const expected = process.env["STAFF_PASSWORD"];
    if (!expected) throw new Error("Staff password is not configured");
    if (!matches(data.password, expected)) return { ok: false as const };
    const s = await useSession<StaffSession>(sessionConfig());
    await s.update({ staff: true });
    return { ok: true as const };
  });

export const lockStaff = createServerFn({ method: "POST" }).handler(async () => {
  const s = await useSession<StaffSession>(sessionConfig());
  await s.clear();
  return { ok: true as const };
});

export const addPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; region: string }) => {
    const u = String(d.username ?? "").trim();
    if (!/^[A-Za-z0-9_]{2,16}$/.test(u)) throw new Error("Invalid Minecraft username");
    if (!REGIONS.includes(d.region)) throw new Error("Invalid region");
    return { username: u, region: d.region };
  })
  .handler(async ({ data }) => {
    const db = await requireStaff();
    let username = data.username;
    let uuid: string | null = null;
    try {
      const r = await fetch(`https://api.crafty.gg/api/v2/players/${username}`, {
        headers: { accept: "application/json", "user-agent": "PvPLadder/1.0" },
      });
      if (r.ok) {
        const j = (await r.json()) as { data?: { uuid?: string; username?: string } };
        if (j.data?.uuid) { uuid = j.data.uuid; username = j.data.username ?? username; }
      }
    } catch { /* fall back */ }
    if (!uuid) {
      const m = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
      if (!m.ok) throw new Error("Player not found");
      const j = (await m.json()) as { id: string; name: string };
      uuid = j.id; username = j.name;
    }
    const { error } = await db.from("players").insert({ username, mc_uuid: uuid, region: data.region });
    if (error) throw new Error(error.code === "23505" ? "Player already on the ladder" : "Couldn't add player");
    return { username };
  });

export const setTier = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string; kit: string; tier: string }) => {
    if (d.tier !== "" && !(TIERS as readonly string[]).includes(d.tier)) throw new Error("Invalid tier");
    return d;
  })
  .handler(async ({ data }) => {
    const db = await requireStaff();
    const { error } = data.tier === ""
      ? await db.from("player_tiers").delete().eq("player_id", data.playerId).eq("kit", data.kit)
      : await db.from("player_tiers").upsert({ player_id: data.playerId, kit: data.kit, tier: data.tier, updated_at: new Date().toISOString() });
    if (error) throw new Error("Couldn't save tier");
    return { ok: true };
  });

export const updateRegion = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string; region: string }) => {
    if (!REGIONS.includes(d.region)) throw new Error("Invalid region");
    return d;
  })
  .handler(async ({ data }) => {
    const db = await requireStaff();
    const { error } = await db.from("players").update({ region: data.region }).eq("id", data.playerId);
    if (error) throw new Error("Couldn't update region");
    return { ok: true };
  });

export const removePlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string }) => d)
  .handler(async ({ data }) => {
    const db = await requireStaff();
    const { error } = await db.from("players").delete().eq("id", data.playerId);
    if (error) throw new Error("Couldn't remove player");
    return { ok: true };
  });
