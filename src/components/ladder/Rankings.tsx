import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "./Header";
import { KitIcon } from "./KitIcon";
import { ladderQuery, type LadderPlayer } from "@/lib/ladder";
import {
  KITS, OVERALL_ICON, TIER_POINTS, avatarFallback, avatarUrl,
  regionClass, tierBadgeClass, tierRingClass, kitPoints, isLowerTier,
} from "@/lib/kits";

export function Avatar({ p, className }: { p: { username: string; mc_uuid: string | null }; className?: string }) {
  return (
    <img
      src={avatarUrl(p.username, p.mc_uuid)}
      alt={p.username}
      loading="lazy"
      className={className}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.dataset["fb"]) { img.dataset["fb"] = "1"; img.src = avatarFallback(p.username); }
      }}
    />
  );
}

function KitTabs({ kit }: { kit?: string | undefined }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Link
        to="/"
        className={`flex h-12 items-center gap-2 rounded-lg border px-4 font-display text-sm font-bold ${!kit ? "bg-accent shadow-glow" : "bg-row hover:bg-accent"}`}
      >
        <KitIcon kit={{ id: "overall", name: "Overall", image: OVERALL_ICON, tone: "text-gold" }} className="h-6 w-6 text-gold" /> OVERALL
      </Link>
      {KITS.map((k) => (
        <Link
          key={k.id}
          to="/rankings/$kit"
          params={{ kit: k.id }}
          title={k.name}
          className={`flex h-12 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${kit === k.id ? "bg-accent shadow-glow" : "bg-row hover:bg-accent"}`}
        >
          <KitIcon kit={k} className={`h-6 w-6 ${k.tone}`} />
          {kit === k.id && <span className="font-display">{k.name}</span>}
        </Link>
      ))}
    </div>
  );
}

function TierChip({ kitId, tier }: { kitId: string; tier?: string | undefined }) {
  const k = KITS.find((x) => x.id === kitId);
  if (!k) return null;
  return (
    <div className="flex flex-col items-center gap-0.5" title={`${k.name}: ${tier ?? "Unranked"}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-full bg-background ring-2 ${tier ? tierRingClass(tier) : "ring-low opacity-50"}`}>
        <KitIcon kit={k} className={`h-4 w-4 ${k.tone}`} />
      </span>
      <span className={`min-w-11 rounded-md px-1.5 text-center font-display text-xs font-bold ${tierBadgeClass(tier)}`}>
        {tier ?? "-"}
      </span>
    </div>
  );
}

function rankBg(i: number) {
  return i === 0 ? "bg-rank-1" : i === 1 ? "bg-rank-2" : i === 2 ? "bg-rank-3" : "bg-rank-n";
}

function Row({ p, i, kit }: { p: LadderPlayer; i: number; kit?: string | undefined }) {
  const points = kit ? kitPoints(p.tiers[kit], p.bonuses[kit] ?? 0, p.tierLP[kit]) : p.points;
  const bonus = kit ? (isLowerTier(p.tiers[kit]) ? 0 : p.bonuses[kit] ?? 0) : Object.entries(p.bonuses).reduce((sum, [id, value]) => sum + (isLowerTier(p.tiers[id]) ? 0 : value), 0);
  const sorted = Object.entries(p.tiers).sort((a, b) => TIER_POINTS[b[1]] - TIER_POINTS[a[1]]);
  const unranked = KITS.filter((k) => !p.tiers[k.id]).map((k) => [k.id, undefined] as const);
  return (
    <div className="flex items-stretch overflow-hidden rounded-lg border bg-row">
      <div className={`relative flex w-32 shrink-0 items-center rank-slant ${rankBg(i)}`}>
        <span className="pl-4 font-display text-3xl font-black italic text-foreground drop-shadow">{i + 1}.</span>
        <Avatar p={p} className="absolute bottom-0 right-5 h-14" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3 md:w-64 md:flex-none">
        <span className="truncate font-display text-xl font-bold">{p.username}</span>
        <span className="text-xs font-semibold text-muted-foreground">
          <span className="text-primary">◆</span> <span title={`Base: ${points - bonus} LP · Bonus: ${bonus > 0 ? "+" : ""}${bonus} LP`}>{points} LP</span>
        </span>
      </div>
      <div className="flex items-center border-x px-4">
        <span className={`rounded-md px-2.5 py-1 font-display text-lg font-bold ${regionClass(p.region)}`}>{p.region}</span>
      </div>
      <div className="hidden flex-1 flex-wrap items-center justify-center gap-2 px-4 py-2 lg:flex">
        {kit ? (
          <TierChip kitId={kit} tier={p.tiers[kit]} />
        ) : (
          [...sorted, ...unranked].map(([k, t]) => <TierChip key={k} kitId={k} tier={t} />)
        )}
      </div>
    </div>
  );
}

export function Rankings({ kit, q }: { kit?: string | undefined; q?: string | undefined }) {
  const { data, isLoading, error } = useQuery(ladderQuery);
  let list = data ?? [];
  if (kit) {
    list = list.filter((p) => p.tiers[kit]).sort((a, b) => kitPoints(b.tiers[kit], b.bonuses[kit] ?? 0, b.tierLP[kit]) - kitPoints(a.tiers[kit], a.bonuses[kit] ?? 0, a.tierLP[kit]));
  } else list = [...list].sort((a, b) => b.points - a.points);
  const ranked = list.map((p, i) => ({ p, i }));
  const shown = q ? ranked.filter(({ p }) => p.username.toLowerCase().includes(q.toLowerCase())) : ranked;

  return (
    <div className="min-h-screen px-4 pb-16">
      <Header />
      <main className="mx-auto mt-8 max-w-6xl rounded-xl border bg-panel p-5">
        <KitTabs kit={kit} />
        <div className="mt-4 hidden grid-cols-[8rem_16rem_6rem_1fr] px-4 pb-2 text-sm font-semibold text-muted-foreground lg:grid">
          <span className="pl-4">#</span><span className="pl-4">Player</span><span>Region</span><span className="text-center">Tiers</span>
        </div>
        <div className="space-y-2">
          {isLoading && <p className="py-10 text-center text-muted-foreground">Loading rankings…</p>}
          {error && <p className="py-10 text-center text-destructive">Couldn't load rankings.</p>}
          {!isLoading && shown.length === 0 && <p className="py-10 text-center text-muted-foreground">No players found.</p>}
          {shown.map(({ p, i }) => <Row key={p.id} p={p} i={i} kit={kit} />)}
        </div>
      </main>
    </div>
  );
}
