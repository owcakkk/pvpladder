// Server-only Minecraft username -> UUID lookup with fallbacks.
export async function lookupMcPlayer(input: string): Promise<{ username: string; uuid: string } | null> {
  let username = input;
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
  const sources: Array<[string, (j: any) => { id?: string; name?: string } | undefined]> = [
    [`https://api.minecraftservices.com/minecraft/profile/lookup/name/${username}`, (j) => j],
    [`https://api.mojang.com/users/profiles/minecraft/${username}`, (j) => j],
    [`https://playerdb.co/api/player/minecraft/${username}`, (j) => {
      const pl = j?.data?.player; return pl ? { id: pl.raw_id, name: pl.username } : undefined;
    }],
  ];
  for (const [url, pick] of sources) {
    if (uuid) break;
    try {
      const m = await fetch(url, { headers: { accept: "application/json", "user-agent": "PvPLadder/1.0" } });
      if (!m.ok) { console.warn("lookup failed", url, m.status); continue; }
      const r = pick(await m.json());
      if (r?.id) { uuid = r.id; username = r.name ?? username; }
    } catch (e) { console.warn("lookup error", url, e); }
  }
  return uuid ? { username, uuid } : null;
}
