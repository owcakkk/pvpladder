import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Swords } from "lucide-react";
import { Header } from "./Header";
import { KitIcon } from "./KitIcon";
import { Avatar } from "./Rankings";
import { RankBadge, RankChangeChip } from "./RankBadge";
import { TierJourneyDialog } from "./TierJourney";
import { ladderQuery, rankBaselineQuery, type LadderPlayer } from "@/lib/ladder";
import { rankDelta, rankMaps, type RankDelta, type RankMaps } from "@/lib/ranking";
import {
  KITS, compareKitsByTier, isLowerTier, kitPoints, regionClass, tierBadgeClass, tierRingClass, type Tier,
} from "@/lib/kits";

function KitCard({ kitId, tier, bonus, lp, synced, rank, delta, onJourney }: { kitId: string; tier?: Tier | undefined; bonus: number; lp: number | null; synced?: NonNullable<LadderPlayer["synced"]>[string] | undefined; rank?: number | undefined; delta?: RankDelta; onJourney?: (() => void) | undefined }) {
  const k = KITS.find((x) => x.id === kitId);
  if (!k) return null;
  const points = kitPoints(tier, tier && !isLowerTier(tier) ? bonus : 0, lp);
  return (
    <div className="rounded-lg border bg-row px-4 py-3">
      <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background ring-2 ${tier ? tierRingClass(tier) : "ring-low opacity-50"}`}>
          <KitIcon kit={k} className={`h-5 w-5 ${k.tone}`} />
        </span>
        <div className="min-w-0">
          <span className="block truncate font-display font-bold">{k.name}</span>
          <span className={`inline-block rounded-md px-1.5 text-center font-display text-xs font-bold ${tierBadgeClass(tier)}`}>
            {tier ?? "Unranked"}
          </span>
          {rank != null && <span className="ml-1.5 text-xs font-bold text-muted-foreground" title={`Rank #${rank} in ${k.name}`}>#{rank}</span>}
          <RankChangeChip delta={delta ?? null} className="ml-1" />
        </div>
      </div>
      <div className="text-right">
        <span className="block font-display text-xl font-black text-primary">{synced && synced.lp != null ? `${synced.lp} LP` : `${points} LP`}</span>
        <span className="text-xs font-semibold text-muted-foreground">
          {synced ? new Date(synced.testedAt).toLocaleDateString("en-GB", { timeZone: "UTC" }) : tier
            ? isLowerTier(tier)
              ? `${lp ?? 0} tier LP`
              : bonus !== 0
                ? `${bonus > 0 ? "+" : ""}${bonus} bonus LP`
                : `${tier} tier`
            : "No tier yet"}
        </span>
      </div>
      </div>
      {tier && onJourney && (
        <button type="button" onClick={onJourney} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <TrendingUp className="h-3 w-3" /> Tier journey
        </button>
      )}
      {synced?.categories != null && <dl className="mt-3 space-y-1 border-t pt-2 text-xs">
        {Object.entries(synced.categories).map(([name, value]) => <div key={name} className="flex flex-wrap justify-between gap-2">
          <dt className="break-all text-muted-foreground">{name}</dt><dd className="max-w-full break-all font-semibold">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
        </div>)}
      </dl>}
    </div>
  );
}

export function PlayerProfile({ player, ranks, baseline }: { player: LadderPlayer; ranks?: RankMaps | undefined; baseline?: RankMaps | null | undefined }) {
  const byTier = compareKitsByTier(player.tiers, player.bonuses, player.tierLP);
  const ranked = KITS
    .filter((k) => player.tiers[k.id])
    .sort((a, b) => byTier(a.id, b.id));


  const unranked = KITS.filter((k) => !player.tiers[k.id]);
  const [journeyKit, setJourneyKit] = useState<string | null>(null);
  const journey = journeyKit ? KITS.find((k) => k.id === journeyKit) : undefined;
  const overallRank = ranks?.overall[player.id];
  const kitRank = (kitId: string) => ranks?.kits[kitId]?.[player.id];
  const kitDelta = (kitId: string) => { const r = kitRank(kitId); return r == null ? null : rankDelta(baseline?.kits[kitId], player.id, r); };
  const bestKits = ranked.flatMap((k) => { const r = kitRank(k.id); return r == null ? [] : [{ k, r }]; })
    .sort((a, b) => a.r - b.r).slice(0, 4);

  return (
    <div className="min-h-screen px-4 pb-16">
      <Header />
      <main className="mx-auto mt-8 max-w-5xl">
        <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to rankings
          </Link>
          <Link to="/compare" search={{ a: player.id }} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Swords className="h-4 w-4" /> Compare with another player
          </Link>
        </div>
        <section className="rounded-xl border bg-panel p-6">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar p={player} className="h-28 shrink-0" />
            <div className="min-w-0">
              <h1 className="break-words font-display text-3xl font-black">{player.username}</h1>
              <div className="mt-2 flex items-center gap-3">
                <span className={`rounded-md px-2.5 py-1 font-display text-sm font-bold ${regionClass(player.region)}`}>
                  {player.region}
                </span>
                <span className="font-display text-lg font-bold text-primary">◆ {player.points} LP</span>
              </div>
              {overallRank != null && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RankBadge rank={overallRank} label="Overall" delta={baseline ? rankDelta(baseline.overall, player.id, overallRank) : null} />
                  {bestKits.map(({ k, r }) => <RankBadge key={k.id} rank={r} label={k.name} kitId={k.id} delta={kitDelta(k.id)} />)}
                </div>
              )}
            </div>
          </div>
          <h2 className="mb-3 mt-6 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Kit tiers</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...ranked, ...unranked].map((k) => (
              <KitCard
                key={k.id}
                kitId={k.id}
                tier={player.tiers[k.id]}
                bonus={player.bonuses[k.id] ?? 0}
                lp={player.tierLP[k.id] ?? null}
                synced={player.synced?.[k.id]}
                rank={kitRank(k.id)}
                delta={kitDelta(k.id)}
                onJourney={() => setJourneyKit(k.id)}
              />
            ))}
          </div>
        </section>
      </main>
      {journey && <TierJourneyDialog playerId={player.id} playerName={player.username} kit={journey} onClose={() => setJourneyKit(null)} />}
    </div>
  );
}

export function PlayerProfilePage({ playerId }: { playerId: string }) {
  const { data: players } = useSuspenseQuery(ladderQuery);
  const { data: baseline } = useQuery(rankBaselineQuery);
  const ranks = useMemo(() => rankMaps(players), [players]);
  const player = players.find((p) => p.id === playerId);
  if (!player) return <p className="py-16 text-center text-muted-foreground">Player not found.</p>;
  return <PlayerProfile player={player} ranks={ranks} baseline={baseline} />;
}
