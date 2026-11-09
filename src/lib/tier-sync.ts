import { z } from "zod";
import { KITS, TIERS, validateTierLP } from "./kits";

export const SYNC_WINDOW_MS = 5 * 60 * 1000;
const playerSchema = z.object({
  username: z.string().regex(/^[A-Za-z0-9_]{2,16}$/),
  kit: z.string().refine((id) => KITS.some((kit) => kit.id === id), "Unknown kit"),
  kitName: z.string().trim().min(1).max(80),
  tier: z.enum(TIERS),
  totalLp: z.number().int().min(0).max(2147483647).nullable(),
  categories: z.union([z.record(z.unknown()), z.array(z.unknown()), z.null()]).refine((value) => JSON.stringify(value).length <= 20000, "Categories too large"),
  testedAt: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  discordId: z.string().regex(/^\d{1,30}$/),
  previousTier: z.enum(TIERS).nullable().optional(),
  previousLp: z.number().int().nonnegative().nullable().optional(),
  region: z.enum(["EU", "NA", "AS", "SA", "OC", "AF"]).optional(),
  testerId: z.string().regex(/^\d{1,30}$/).optional(),
  guildId: z.string().regex(/^\d{1,30}$/).optional(),
}).superRefine((player, context) => {
  try { validateTierLP(player.tier, player.totalLp); }
  catch { context.addIssue({ code: "custom", message: "LP must match the tier range", path: ["totalLp"] }); }
});

export type SyncPlayer = z.infer<typeof playerSchema>;
export const syncPayloadSchema = z.union([
  z.object({ event: z.enum(["result", "highresult"]) }).and(playerSchema),
  z.object({ event: z.literal("snapshot"), players: z.array(playerSchema).max(100), batch: z.number().int().nonnegative(), batches: z.number().int().positive() }),
]);

export function syncPlayers(value: unknown, now = Date.now()): SyncPlayer[] {
  const body = syncPayloadSchema.parse(value);
  const players = body.event === "snapshot" ? body.players : [body];
  if (players.some((player) => player.testedAt > now + SYNC_WINDOW_MS)) throw new Error("Test date is in the future");
  const unique = new Map<string, SyncPlayer>();
  for (const player of players) {
    const key = `${player.username.toLowerCase()}:${player.kit}`;
    const previous = unique.get(key);
    if (!previous || previous.testedAt < player.testedAt) unique.set(key, player);
  }
  return [...unique.values()];
}