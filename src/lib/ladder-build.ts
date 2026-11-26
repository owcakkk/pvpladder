import { computePoints, type Tier } from "./kits";
import type { Json } from "@/integrations/supabase/types";

export type LadderPlayer = {
  id: string;
  username: string;
  mc_uuid: string | null;
  region: string;
  tiers: Record<string, Tier>;
  bonuses: Record<string, number>;
  tierLP: Record<string, number | null>;
  points: number;
  synced?: Record<string, { lp: number | null; categories: Json | null; testedAt: number; kitName: string | null }>;
};

export type PlayerRow = { id: string; username: string; mc_uuid: string | null; region: string };
export type TierRow = {
  player_id: string; kit: string; tier: string; bonus_points: number; tier_lp: number | null; total_lp: number | null;
  categories: Json | null; tested_at: number | null; kit_name: string | null;
};

// Shared by the website (browser) and the daily rank snapshot job (server).
export function buildLadderPlayers(players: PlayerRow[], tiers: TierRow[]): LadderPlayer[] {
  return players.map((p) => {
    const t: Record<string, Tier> = {};
    const bonuses: Record<string, number> = {};
    const tierLP: Record<string, number | null> = {};
    const synced: NonNullable<LadderPlayer["synced"]> = {};
    for (const r of tiers) if (r.player_id === p.id) {
      t[r.kit] = r.tier as Tier;
      bonuses[r.kit] = r.bonus_points;
      tierLP[r.kit] = r.tier_lp;
      if (r.tested_at != null) synced[r.kit] = { lp: r.total_lp, categories: r.categories, testedAt: r.tested_at, kitName: r.kit_name };
    }
    return { ...p, tiers: t, bonuses, tierLP, synced, points: computePoints(t, bonuses, tierLP) };
  });
}
