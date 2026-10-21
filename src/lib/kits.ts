import {
  Trophy, Sword, Axe, Hammer, Gavel, Heart, Home, Gem, FlaskConical, Flame, Target, Crosshair,
  type LucideIcon,
} from "lucide-react";

export type Kit = { id: string; name: string; icon: LucideIcon; tone: string };

// Placeholder icons — replace with uploaded artwork later.
export const KITS: Kit[] = [
  { id: "sword", name: "Sword", icon: Sword, tone: "text-region-other" },
  { id: "axe", name: "Axe", icon: Axe, tone: "text-silver" },
  { id: "mace", name: "Mace", icon: Hammer, tone: "text-muted-foreground" },
  { id: "spearmace", name: "Spear & Mace", icon: Gavel, tone: "text-primary" },
  { id: "uhc", name: "UHC", icon: Heart, tone: "text-destructive" },
  { id: "smp", name: "SMP", icon: Home, tone: "text-region-eu" },
  { id: "diasmp", name: "Diamond SMP", icon: Gem, tone: "text-region-other" },
  { id: "diapot", name: "Diamond Pot", icon: FlaskConical, tone: "text-region-as" },
  { id: "nethop", name: "Netherite OP", icon: Flame, tone: "text-bronze" },
  { id: "bowcart", name: "Bow Cart", icon: Target, tone: "text-gold" },
  { id: "xbowcart", name: "X-Bow Cart", icon: Crosshair, tone: "text-region-na" },
];
export const OVERALL_ICON = Trophy;

export const TIERS = ["HT1", "LT1", "HT2", "LT2", "HT3", "LT3", "HT4", "LT4", "HT5", "LT5"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_POINTS: Record<Tier, number> = {
  HT1: 60, LT1: 45, HT2: 30, LT2: 20, HT3: 10, LT3: 6, HT4: 4, LT4: 3, HT5: 2, LT5: 1,
};

export const TITLES = [
  { min: 400, name: "Combat Grandmaster" },
  { min: 250, name: "Combat Master" },
  { min: 100, name: "Combat Ace" },
  { min: 50, name: "Combat Specialist" },
  { min: 20, name: "Combat Cadet" },
  { min: 10, name: "Combat Novice" },
  { min: 0, name: "Rookie" },
];

export const titleFor = (points: number) => TITLES.find((t) => points >= t.min)!.name;

export const tierBadgeClass = (tier?: string) => {
  const n = tier?.[2];
  if (n === "1") return "bg-gold text-background";
  if (n === "2") return "bg-silver text-background";
  if (n === "3") return "bg-bronze text-background";
  return "bg-low text-low-foreground";
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
