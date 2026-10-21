import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TIER_POINTS, type Tier } from "./kits";

export type LadderPlayer = {
  id: string;
  username: string;
  mc_uuid: string | null;
  region: string;
  tiers: Record<string, Tier>;
  points: number;
};

export const computePoints = (tiers: Record<string, Tier>) =>
  Object.values(tiers).reduce((s, t) => s + (TIER_POINTS[t] ?? 0), 0);

export const ladderQuery = queryOptions({
  queryKey: ["ladder"],
  queryFn: async (): Promise<LadderPlayer[]> => {
    const [{ data: players, error }, { data: tiers, error: e2 }] = await Promise.all([
      supabase.from("players").select("id, username, mc_uuid, region"),
      supabase.from("player_tiers").select("player_id, kit, tier"),
    ]);
    if (error) throw error;
    if (e2) throw e2;
    return (players ?? []).map((p) => {
      const t: Record<string, Tier> = {};
      for (const r of tiers ?? []) if (r.player_id === p.id) t[r.kit] = r.tier as Tier;
      return { ...p, tiers: t, points: computePoints(t) };
    });
  },
});
