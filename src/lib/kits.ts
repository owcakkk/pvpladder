import { Crosshair, Trophy, type LucideIcon } from "lucide-react";
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
  { id: "xbowcart", name: "X-Bow Cart", icon: Crosshair, tone: "text-region-na" },
];
export const OVERALL_ICON = Trophy;
