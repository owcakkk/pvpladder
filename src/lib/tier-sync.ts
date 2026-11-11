import { z } from "zod";
import { KITS, TIERS, tierForLP, isLowerTier } from "./kits";

export const SYNC_WINDOW_MS = 5 * 60 * 1000;
const id = z.union([z.string(), z.number()]).transform(String).pipe(z.string().regex(/^\d{1,30}$/));
const playerSchema = z.object({
  username: z.string().regex(/^[A-Za-z0-9_]{2,16}$/),
  kit: z.string().refine((k) => KITS.some((kit) => kit.id === k), "Unknown kit"),
  kitName: z.string().trim().min(1).max(80),
  tier: z.enum(TIERS),
  totalLp: z.number().int().min(0).max(2147483647).nullish(),
  categories: z.union([z.record(z.unknown()), z.array(z.unknown())]).nullish()
    .refine((v) => v == null || JSON.stringify(v).length <= 20000, "Categories too large"),
  testedAt: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullish(),
  discordId: id.nullish(),
  previousTier: z.enum(TIERS).nullish(),
  previousLp: z.number().int().nonnegative().nullish(),
  region: z.enum(["EU", "NA", "AS", "SA", "OC", "AF"]).nullish(),
  testerId: id.nullish(),
  guildId: id.nullish(),
}).passthrough().superRefine((p, ctx) => {
  if (p.totalLp != null && isLowerTier(p.tier) && (p.totalLp > 400 || tierForLP(p.totalLp) !== p.tier))
    ctx.addIssue({ code: "custom", message: "LP must match the tier range", path: ["totalLp"] });
});

export type SyncPlayer = z.infer<typeof playerSchema>;
const singleSchema = playerSchema.and(z.object({ event: z.enum(["result", "highresult"]) }));
const snapshotSchema = z.object({
  event: z.literal("snapshot"),
  guildId: id.nullish(),
  players: z.array(playerSchema),
  batch: z.number().int().nonnegative().nullish(),
  batches: z.number().int().positive().nullish(),
});

export class SyncPayloadError extends Error {
  constructor(public field: string) { super("Invalid tier payload"); }
}
const fieldOf = (error: z.ZodError) => {
  const path = error.issues[0]?.path ?? [];
  return path.reduce<string>((s, part) => typeof part === "number" ? `${s}[${part}]` : s ? `${s}.${part}` : String(part), "") || "body";
};

export function syncPlayers(value: unknown, now = Date.now()): SyncPlayer[] {
  const event = (value as { event?: unknown } | null)?.event;
  let players: SyncPlayer[];
  if (event === "snapshot") {
    const r = snapshotSchema.safeParse(value);
    if (!r.success) throw new SyncPayloadError(fieldOf(r.error));
    players = r.data.players.map((p) => ({ ...p, guildId: p.guildId ?? r.data.guildId }));
  } else if (event === "result" || event === "highresult") {
    const r = singleSchema.safeParse(value);
    if (!r.success) throw new SyncPayloadError(fieldOf(r.error));
    players = [r.data];
  } else throw new SyncPayloadError("event");
  players = players.map((p) => ({ ...p, testedAt: p.testedAt ?? now }));
  const future = players.findIndex((p) => (p.testedAt ?? 0) > now + SYNC_WINDOW_MS);
  if (future >= 0) throw new SyncPayloadError(event === "snapshot" ? `players[${future}].testedAt` : "testedAt");
  const unique = new Map<string, SyncPlayer>();
  for (const p of players) {
    const key = `${p.username.toLowerCase()}:${p.kit}`;
    const prev = unique.get(key);
    if (!prev || (prev.testedAt ?? 0) <= (p.testedAt ?? 0)) unique.set(key, p);
  }
  return [...unique.values()];
}
