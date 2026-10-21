import { createServerFn } from "@tanstack/react-start";

// Looks up a Minecraft player via crafty.gg (falls back to Mojang if crafty is unreachable).
export const lookupPlayer = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string }) => {
    const u = String(input.username ?? "").trim();
    if (!/^[A-Za-z0-9_]{2,16}$/.test(u)) throw new Error("Invalid Minecraft username");
    return { username: u };
  })
  .handler(async ({ data }) => {
    try {
      const r = await fetch(`https://api.crafty.gg/api/v2/players/${data.username}`, {
        headers: { accept: "application/json", "user-agent": "PvPLadder/1.0" },
      });
      if (r.ok) {
        const j = (await r.json()) as { data?: { uuid?: string; username?: string } };
        if (j.data?.uuid) return { username: j.data.username ?? data.username, uuid: j.data.uuid, source: "crafty" };
      }
    } catch { /* fall through */ }
    const m = await fetch(`https://api.mojang.com/users/profiles/minecraft/${data.username}`);
    if (!m.ok) throw new Error("Player not found");
    const j = (await m.json()) as { id: string; name: string };
    return { username: j.name, uuid: j.id, source: "mojang" };
  });
