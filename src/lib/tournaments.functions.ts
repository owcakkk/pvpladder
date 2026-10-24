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

const validTitle = (d: { title: string }) => {
  const title = String(d.title ?? "").trim();
  if (!title || title.length > 80) throw new Error("Enter a title (max 80 characters)");
  return title;
};

export const createTournament = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string }) => ({ title: validTitle(d) }))
  .handler(async ({ data }) => {
    const db = await requireStaff();
    const { data: row, error } = await db.from("tournaments").insert({ title: data.title }).select("id").single();
    if (error || !row) throw new Error("Couldn't create tournament");
    return { id: row.id as string };
  });

export const deleteTournament = createServerFn({ method: "POST" })
  .inputValidator((d: { tournamentId: string }) => d)
  .handler(async ({ data }) => {
    const db = await requireStaff();
    const { error } = await db.from("tournaments").delete().eq("id", data.tournamentId);
    if (error) throw new Error("Couldn't delete tournament");
    return { ok: true };
  });

export const setTournamentTitle = createServerFn({ method: "POST" })
  .inputValidator((d: { tournamentId: string; title: string }) => ({ tournamentId: d.tournamentId, title: validTitle(d) }))
  .handler(async ({ data }) => {
    const db = await requireStaff();
    const { error } = await db.from("tournaments").update({ title: data.title }).eq("id", data.tournamentId);
    if (error) throw new Error("Couldn't save title");
    return { ok: true };
  });

export const addTournamentPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { tournamentId: string; username: string }) => {
    const u = String(d.username ?? "").trim();
    if (!/^[A-Za-z0-9_]{2,16}$/.test(u)) throw new Error("Invalid Minecraft username");
    return { tournamentId: d.tournamentId, username: u };
  })
  .handler(async ({ data }) => {
    const db = await requireStaff();
    const { count } = await db
      .from("tournament_players").select("id", { count: "exact", head: true }).eq("tournament_id", data.tournamentId);
    if ((count ?? 0) >= MAX_TOURNAMENT_PLAYERS) throw new Error(`Tournament is full (max ${MAX_TOURNAMENT_PLAYERS} players)`);
    const found = await lookupMcPlayer(data.username);
    if (!found) throw new Error("Player not found");
    const { error } = await db.from("tournament_players")
      .insert({ tournament_id: data.tournamentId, username: found.username, mc_uuid: found.uuid });
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
