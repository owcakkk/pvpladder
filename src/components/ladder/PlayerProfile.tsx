import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Swords } from "lucide-react";
import { Header } from "./Header";
import { KitIcon } from "./KitIcon";
import { Avatar } from "./Rankings";
import { ladderQuery, type LadderPlayer } from "@/lib/ladder";
import {
  allKits, kitFor, compareKitsByTier, isLowerTier, kitPoints, regionClass, tierBadgeClass, tierRingClass, type Tier,
} from "@/lib/kits";

function KitCard({ kitId, tier, bonus, lp, synced }: { kitId: string; tier?: Tier | undefined; bonus: number; lp: number | null; synced?: NonNullable<LadderPlayer["synced"]>[string] | undefined }) {
  const k = kitFor(kitId, synced?.kitName);
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
        </div>
      </div>
      <div className="text-right">
        <span className="block font-display text-xl font-black text-primary">{synced ? synced.lp == null ? "-" : `${synced.lp} LP` : `${points} LP`}</span>
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
      {synced?.categories != null && <dl className="mt-3 space-y-1 border-t pt-2 text-xs">
        {Object.entries(synced.categories).map(([name, value]) => <div key={name} className="flex flex-wrap justify-between gap-2">
          <dt className="break-all text-muted-foreground">{name}</dt><dd className="max-w-full break-all font-semibold">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
        </div>)}
      </dl>}
    </div>
  );
}

export function PlayerProfile({ player }: { player: LadderPlayer }) {
  const byTier = compareKitsByTier(player.tiers, player.bonuses, player.tierLP);
  const ranked = allKits([player])
    .filter((k) => player.tiers[k.id])
    .sort((a, b) => byTier(a.id, b.id));


  const unranked = allKits([player]).filter((k) => !player.tiers[k.id]);

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
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export function PlayerProfilePage({ playerId }: { playerId: string }) {
  const { data: players } = useSuspenseQuery(ladderQuery);
  const player = players.find((p) => p.id === playerId);
  if (!player) return <p className="py-16 text-center text-muted-foreground">Player not found.</p>;
  return <PlayerProfile player={player} />;
}
