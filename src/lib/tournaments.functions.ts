import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { lookupMcPlayer } from "./mc-lookup.server";

type StaffSession = { staff?: boolean };

const sessionConfig = () => ({
  password: process.env["SESSION_SECRET"]!,
  name: "staff-gate",
  maxAge: 60 * 60 * 24 * 7,
  cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
});

async function requireStaff() {
  const s = await useSession<StaffSession>(sessionConfig());
  if (!s.data.staff) throw new Error("Staff password required");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const MAX_TOURNAMENT_PLAYERS = 10;

async function ensureTournament(db: Awaited<ReturnType<typeof requireStaff>>) {
  const { data: existing } = await db
    .from("tournaments").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (existing) return existing.id as string;
  const { data: created, error } = await db.from("tournaments").insert({}).select("id").single();
  if (error || !created) throw new Error("Couldn't create tournament");
  return created.id as string;
}

export const setTournamentTitle = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string }) => {
    const title = String(d.title ?? "").trim();
    if (!title || title.length > 80) throw new Error("Enter a title (max 80 characters)");
    return { title };
  })
  .handler(async ({ data }) => {
    const db = await requireStaff();
    const id = await ensureTournament(db);
    const { error } = await db.from("tournaments").update({ title: data.title }).eq("id", id);
    if (error) throw new Error("Couldn't save title");
    return { ok: true };
  });

export const addTournamentPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string }) => {
    const u = String(d.username ?? "").trim();
    if (!/^[A-Za-z0-9_]{2,16}$/.test(u)) throw new Error("Invalid Minecraft username");
    return { username: u };
  })
  .handler(async ({ data }) => {
    const db = await requireStaff();
    const id = await ensureTournament(db);
    const { count } = await db
      .from("tournament_players").select("id", { count: "exact", head: true }).eq("tournament_id", id);
    if ((count ?? 0) >= MAX_TOURNAMENT_PLAYERS) throw new Error(`Tournament is full (max ${MAX_TOURNAMENT_PLAYERS} players)`);
    const found = await lookupMcPlayer(data.username);
    if (!found) throw new Error("Player not found");
    const { error } = await db.from("tournament_players")
      .insert({ tournament_id: id, username: found.username, mc_uuid: found.uuid });
    if (error) throw new Error(error.code === "23505" ? "Player already registered" : "Couldn't add player");
    return { username: found.username };
  });

export const setTournamentRecord = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string; wins: number; losses: number }) => {
    for (const v of [d.wins, d.losses]) {
      if (!Number.isInteger(v) || v < 0 || v > 9999) throw new Error("Wins and losses must be whole numbers from 0 to 9999");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const db = await requireStaff();
    const { error } = await db.from("tournament_players")
      .update({ wins: data.wins, losses: data.losses }).eq("id", data.playerId);
    if (error) throw new Error("Couldn't save record");
    return { ok: true };
  });

export const removeTournamentPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string }) => d)
  .handler(async ({ data }) => {
    const db = await requireStaff();
    const { error } = await db.from("tournament_players").delete().eq("id", data.playerId);
    if (error) throw new Error("Couldn't remove player");
    return { ok: true };
  });
