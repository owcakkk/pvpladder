import { Swords, type LucideIcon } from "lucide-react";
import axeImg from "@/assets/kit-axe.png.asset.json";
import bowcartImg from "@/assets/kit-bowcart.png.asset.json";
import diapotImg from "@/assets/kit-diapot.png.asset.json";
import diasmpImg from "@/assets/kit-diasmp.png.asset.json";
import maceImg from "@/assets/kit-mace.png.asset.json";
import nethopImg from "@/assets/kit-nethop.png.asset.json";
import smpImg from "@/assets/kit-smp.png.asset.json";
import spearmaceImg from "@/assets/kit-spearmace.png.asset.json";
import swordImg from "@/assets/kit-sword.png.asset.json";
import uhcImg from "@/assets/kit-uhc.png.asset.json";
import xbowImg from "@/assets/kit-xbow.png.asset.json";
import overallImg from "@/assets/overall-ladder-big.png.asset.json";

export type Kit = { id: string; name: string; image?: string; icon?: LucideIcon; tone: string };

// `image` = uploaded artwork; `icon` = Lucide fallback for kits without artwork yet.
export const KITS: Kit[] = [
  { id: "sword", name: "Sword", image: swordImg.url, tone: "text-region-other" },
  { id: "axe", name: "Axe", image: axeImg.url, tone: "text-silver" },
  { id: "mace", name: "Mace", image: maceImg.url, tone: "text-muted-foreground" },
  { id: "spear-mace", name: "Spear & Mace", image: spearmaceImg.url, tone: "text-primary" },
  { id: "uhc", name: "UHC", image: uhcImg.url, tone: "text-destructive" },
  { id: "smp", name: "SMP", image: smpImg.url, tone: "text-region-eu" },
  { id: "diamond-smp", name: "Diamond SMP", image: diasmpImg.url, tone: "text-region-other" },
  { id: "diamond-pot", name: "Diamond Pot", image: diapotImg.url, tone: "text-region-as" },
  { id: "netherite-op", name: "Netherite OP", image: nethopImg.url, tone: "text-bronze" },
  { id: "bow-cart", name: "Bow Cart", image: bowcartImg.url, tone: "text-gold" },
  { id: "xbow-cart", name: "X-Bow Cart", image: xbowImg.url, tone: "text-region-na" },
];
export const OVERALL_ICON = overallImg.url;

// Kits the site has no artwork for yet (e.g. new bot kits) use the bot's kitName and a generic icon.
export const kitFor = (id: string, name?: string | null): Kit =>
  KITS.find((kit) => kit.id === id) ?? { id, name: name || id, icon: Swords, tone: "text-muted-foreground" };
export const allKits = (players: { tiers: Record<string, string>; synced?: Record<string, { kitName: string | null }> | undefined }[] = []): Kit[] => {
  const extra = new Map<string, string | null>();
  for (const p of players) for (const id of Object.keys(p.tiers))
    if (!KITS.some((kit) => kit.id === id) && !extra.get(id)) extra.set(id, p.synced?.[id]?.kitName ?? null);
  return [...KITS, ...[...extra].map(([id, name]) => kitFor(id, name))];
};

export const TIERS = ["HT1", "LT1", "HT2", "LT2", "HT3", "LT3", "HT4", "LT4", "HT5", "LT5"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_POINTS: Record<Tier, number> = {
  HT1: 1600, LT1: 1300, HT2: 1000, LT2: 800, HT3: 600, LT3: 0, HT4: 0, LT4: 0, HT5: 0, LT5: 0,
};

export const LP_RANGES = [
  { tier: "LT3", min: 350, max: 400 },
  { tier: "HT4", min: 300, max: 349 },
  { tier: "LT4", min: 250, max: 299 },
  { tier: "HT5", min: 100, max: 249 },
  { tier: "LT5", min: 0, max: 99 },
] as const;
export const isLowerTier = (tier?: string) => LP_RANGES.some((range) => range.tier === tier);
export function tierForLP(points: number): Tier {
  if (!Number.isInteger(points) || points < 0 || points > 400) throw new Error("Tier LP must be a whole number from 0 to 400");
  return LP_RANGES.find((range) => points >= range.min && points <= range.max)?.tier ?? "LT5";
}
export function validateTierLP(tier: string, points?: number | null) {
  if (!isLowerTier(tier)) return null;
  if (points == null) throw new Error("Enter tier LP before saving");
  if (tierForLP(points) !== tier) throw new Error("Tier LP does not match the selected tier's range");
  return points;
}

export const DEFENCE_POINTS = { successful: 50, unsuccessful: -15 } as const;
export const kitPoints = (tier?: Tier, bonus = 0, lp?: number | null) =>
  !tier ? 0 : isLowerTier(tier) ? lp ?? 0 : TIER_POINTS[tier] + bonus;
export const computePoints = (tiers: Record<string, Tier>, bonuses: Record<string, number> = {}, lp: Record<string, number | null> = {}) =>
  Object.entries(tiers).reduce((sum, [kit, tier]) => sum + kitPoints(tier, bonuses[kit] ?? 0, lp[kit]), 0);


export const tierBadgeClass = (tier?: string) => {
  const n = tier?.[2];
  if (n === "1") return "bg-gold text-background";
  if (n === "2") return "bg-silver text-background";
  if (n === "3") return "bg-bronze text-background";
  return "bg-low text-low-foreground";
};

// TIERS is listed highest → lowest, so the array index is the rank (0 = HT1).
// Unranked/unknown tiers return TIERS.length so they sort last.
export const tierRank = (tier?: string) => (tier ? TIERS.indexOf(tier as Tier) : TIERS.length);
export const compareTierResults = (a: { tier?: string | undefined; lp: number | null }, b: { tier?: string | undefined; lp: number | null }) =>
  tierRank(a.tier) - tierRank(b.tier) || (b.lp ?? -1) - (a.lp ?? -1);
export const bestTierRank = (tiers: Record<string, string>) => {
  const values = Object.values(tiers).filter(Boolean).map(tierRank);
  return values.length ? Math.min(...values) : TIERS.length;
};

// LP a player earned in one kit's tier (tier LP for LT3-LT5, tier value + bonus for HT3+).
export const kitEntryPoints = (
  tiers: Record<string, string>,
  bonuses: Record<string, number> = {},
  lp: Record<string, number | null> = {},
  kit: string,
) => kitPoints(tiers[kit] as Tier | undefined, bonuses[kit] ?? 0, lp[kit]);

// Sort kits by tier first, then by the LP earned inside that tier (LT3 330 above LT3 320).
export const compareKitsByTier =
  (tiers: Record<string, string>, bonuses: Record<string, number> = {}, lp: Record<string, number | null> = {}) =>
  (a: string, b: string) =>
    tierRank(tiers[a]) - tierRank(tiers[b])
    || kitEntryPoints(tiers, bonuses, lp, b) - kitEntryPoints(tiers, bonuses, lp, a);

// LP of a player's best tier — the tie-break when two players share a total.
export const bestTierPoints = (
  tiers: Record<string, string>,
  bonuses: Record<string, number> = {},
  lp: Record<string, number | null> = {},
) => {
  const best = bestTierRank(tiers);
  if (best === TIERS.length) return 0;
  const tier = TIERS[best];
  return Object.entries(tiers)
    .filter(([, t]) => t === tier)
    .reduce((max, [kit]) => Math.max(max, kitEntryPoints(tiers, bonuses, lp, kit)), 0);
};


export const tierRingClass = (tier?: string) => {
  const n = tier?.[2];
  if (n === "1") return "ring-gold";
  if (n === "2") return "ring-silver";
  if (n === "3") return "ring-bronze";
  return "ring-low";
};

export const REGIONS = ["EU", "NA", "AS", "SA", "OC", "AF"];
export const regionClass = (r: string) =>
  r === "EU" ? "text-region-eu bg-region-eu/15"
  : r === "NA" ? "text-region-na bg-region-na/15"
  : r === "AS" ? "text-region-as bg-region-as/15"
  : "text-region-other bg-region-other/15";

export const avatarUrl = (name: string, uuid?: string | null) =>
  `https://render.crafty.gg/3d/bust/${uuid ?? name}`;
export const avatarFallback = (name: string) => `https://mc-heads.net/body/${name}/right`;
