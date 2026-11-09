import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computePoints, type Tier } from "./kits";
import type { Json } from "@/integrations/supabase/types";
export { computePoints } from "./kits";

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

export const ladderQuery = queryOptions({
  queryKey: ["ladder"],
  queryFn: async (): Promise<LadderPlayer[]> => {
    const [{ data: players, error }, { data: tiers, error: e2 }] = await Promise.all([
      supabase.from("players").select("id, username, mc_uuid, region"),
      supabase.from("player_tiers").select("player_id, kit, tier, bonus_points, tier_lp, total_lp, categories, tested_at, kit_name"),
    ]);
    if (error) throw error;
    if (e2) throw e2;
    return (players ?? []).map((p) => {
      const t: Record<string, Tier> = {};
      const bonuses: Record<string, number> = {};
      const tierLP: Record<string, number | null> = {};
      const synced: NonNullable<LadderPlayer["synced"]> = {};
      for (const r of tiers ?? []) if (r.player_id === p.id) {
        t[r.kit] = r.tier as Tier;
        bonuses[r.kit] = r.bonus_points;
        tierLP[r.kit] = r.tier_lp;
        if (r.tested_at != null) synced[r.kit] = { lp: r.total_lp, categories: r.categories, testedAt: r.tested_at, kitName: r.kit_name };
      }
      return { ...p, tiers: t, bonuses, tierLP, synced, points: computePoints(t, bonuses, tierLP) };
    });
  },
});
