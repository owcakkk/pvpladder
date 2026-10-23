import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computePoints, type Tier } from "./kits";
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
};

export const ladderQuery = queryOptions({
  queryKey: ["ladder"],
  queryFn: async (): Promise<LadderPlayer[]> => {
    const [{ data: players, error }, { data: tiers, error: e2 }] = await Promise.all([
      supabase.from("players").select("id, username, mc_uuid, region"),
      supabase.from("player_tiers").select("player_id, kit, tier, bonus_points, tier_lp"),
    ]);
    if (error) throw error;
    if (e2) throw e2;
    return (players ?? []).map((p) => {
      const t: Record<string, Tier> = {};
      const bonuses: Record<string, number> = {};
      const tierLP: Record<string, number | null> = {};
      for (const r of tiers ?? []) if (r.player_id === p.id) {
        t[r.kit] = r.tier as Tier;
        bonuses[r.kit] = r.bonus_points;
        tierLP[r.kit] = r.tier_lp;
      }
      return { ...p, tiers: t, bonuses, tierLP, points: computePoints(t, bonuses, tierLP) };
    });
  },
});
