import { Anchor, BedDouble, Bomb, Crosshair, Diamond, FlaskConical, Gem, Swords, Target, Wind, Zap } from "lucide-react";
import { KITS, type Kit } from "./kits";

export type LadderId = "pvp" | "sub";

// Which parts of the site exist for a ladder. Features are switched on as the Subtiers
// ladder is built step by step.
export type LadderFeatures = {
  profiles: boolean;
  compare: boolean;
  stats: boolean;
  tournaments: boolean;
  staff: boolean;
  rankArrows: boolean;
  recentResults: boolean;
};

export type LadderConfig = {
  id: LadderId;
  name: string;          // shown in the header
  kits: Kit[];
  basePath: "" | "/sub"; // URL prefix of this ladder
  features: LadderFeatures;
};

// Placeholder icons (Lucide) until the real kit artwork is uploaded: set `image` on a kit to use artwork.
export const SUB_KITS: Kit[] = [
  { id: "speed", name: "Speed", icon: Zap, tone: "text-gold" },
  { id: "diasmp", name: "Diamond SMP", icon: Gem, tone: "text-region-other" },
  { id: "bow", name: "Bow", icon: Target, tone: "text-region-na" },
  { id: "ogv", name: "OGV", icon: Swords, tone: "text-silver" },
  { id: "creeper", name: "Creeper", icon: Bomb, tone: "text-region-eu" },
  { id: "diavanilla", name: "Diamond Vanilla", icon: Diamond, tone: "text-primary" },
  { id: "trident", name: "Trident", icon: Anchor, tone: "text-region-as" },
  { id: "manhunt", name: "Manhunt", icon: Crosshair, tone: "text-destructive" },
  { id: "debuff", name: "Debuff", icon: FlaskConical, tone: "text-bronze" },
  { id: "bed", name: "Bed", icon: BedDouble, tone: "text-region-na" },
  { id: "elytra", name: "Elytra", icon: Wind, tone: "text-muted-foreground" },
];

export const PVP_LADDER: LadderConfig = {
  id: "pvp",
  name: "PvP Ladder",
  kits: KITS,
  basePath: "",
  features: { profiles: true, compare: true, stats: true, tournaments: true, staff: true, rankArrows: true, recentResults: true },
};

export const SUB_LADDER: LadderConfig = {
  id: "sub",
  name: "Subtiers Ladder",
  kits: SUB_KITS,
  basePath: "/sub",
  features: { profiles: false, compare: false, stats: false, tournaments: false, staff: false, rankArrows: false, recentResults: false },
};

// The Subtiers ladder is locked (staff only) unless the setting says "false" explicitly.
// A missing or unreadable setting therefore counts as locked.
export const isSubLadderLocked = (setting: unknown): boolean => setting !== "false";
