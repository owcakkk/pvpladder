import { type LucideIcon } from "lucide-react";
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
import overallImg from "@/assets/overall-ladder.png.asset.json";

export type Kit = { id: string; name: string; image?: string; icon?: LucideIcon; tone: string };

// `image` = uploaded artwork; `icon` = Lucide fallback for kits without artwork yet.
export const KITS: Kit[] = [
  { id: "sword", name: "Sword", image: swordImg.url, tone: "text-region-other" },
  { id: "axe", name: "Axe", image: axeImg.url, tone: "text-silver" },
  { id: "mace", name: "Mace", image: maceImg.url, tone: "text-muted-foreground" },
  { id: "spearmace", name: "Spear & Mace", image: spearmaceImg.url, tone: "text-primary" },
  { id: "uhc", name: "UHC", image: uhcImg.url, tone: "text-destructive" },
  { id: "smp", name: "SMP", image: smpImg.url, tone: "text-region-eu" },
  { id: "diasmp", name: "Diamond SMP", image: diasmpImg.url, tone: "text-region-other" },
  { id: "diapot", name: "Diamond Pot", image: diapotImg.url, tone: "text-region-as" },
  { id: "nethop", name: "Netherite OP", image: nethopImg.url, tone: "text-bronze" },
  { id: "bowcart", name: "Bow Cart", image: bowcartImg.url, tone: "text-gold" },
  { id: "xbowcart", name: "X-Bow Cart", image: xbowImg.url, tone: "text-region-na" },
];
export const OVERALL_ICON = overallImg.url;

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
