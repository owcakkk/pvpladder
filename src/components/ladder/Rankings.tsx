import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "./Header";
import { KitIcon } from "./KitIcon";
import { ladderQueryOf, rankBaselineQuery, type LadderPlayer } from "@/lib/ladder";
import { LadderProvider, themeClass, useLadderConfig } from "@/lib/ladder-context";
import { PVP_LADDER, type LadderConfig } from "@/lib/ladders";
import { rankDelta, sortKit, sortOverall, type RankDelta } from "@/lib/ranking";
import { RankChangeChip } from "./RankBadge";
import {
  OVERALL_ICON, avatarFallback, avatarUrl,
  regionClass, tierBadgeClass, tierRingClass, kitPoints, isLowerTier,
  compareKitsByTier,
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
        if (!img.dataset["fb"]) { img.dataset["fb"] = "1"; img.src = avatarFallback(p.username, p.mc_uuid); }
      }}
    />
  );
}

function KitTabs({ kit }: { kit?: string | undefined }) {
  const ladder = useLadderConfig();
  const sub = ladder.id === "sub";
  const overall = <>
    <KitIcon kit={{ id: "overall", name: "Overall", image: OVERALL_ICON, tone: "text-gold" }} className="h-6 w-6 text-gold" /> OVERALL
  </>;
  const overallClass = `flex h-12 items-center gap-2 rounded-lg border px-4 font-display text-sm font-bold ${!kit ? "bg-accent shadow-glow" : "bg-row hover:bg-accent"}`;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {sub ? <Link to="/sub" className={overallClass}>{overall}</Link> : <Link to="/" className={overallClass}>{overall}</Link>}
      {ladder.kits.map((k) => {
        const className = `flex h-12 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${kit === k.id ? "bg-accent shadow-glow" : "bg-row hover:bg-accent"}`;
        const content = <>
          <KitIcon kit={k} className={`h-6 w-6 ${k.tone}`} />
          {kit === k.id && <span className="font-display">{k.name}</span>}
        </>;
        return sub
          ? <Link key={k.id} to="/sub/rankings/$kit" params={{ kit: k.id }} title={k.name} className={className}>{content}</Link>
          : <Link key={k.id} to="/rankings/$kit" params={{ kit: k.id }} title={k.name} className={className}>{content}</Link>;
      })}
    </div>
  );
}

function TierChip({ kitId, tier }: { kitId: string; tier?: string | undefined }) {
  const k = useLadderConfig().kits.find((x) => x.id === kitId);
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

// Links to a player's profile when this ladder has profile pages, otherwise a plain box.
function PlayerLink({ playerId, className, children }: { playerId: string; className: string; children: React.ReactNode }) {
  const ladder = useLadderConfig();
  if (!ladder.features.profiles) return <div className={className}>{children}</div>;
  return <Link to="/players/$playerId" params={{ playerId }} className={className}>{children}</Link>;
}

// LP shown for a player: in a kit tab the kit's LP (the bot's value, else tier value + bonus), otherwise the total.
function lpInfo(p: LadderPlayer, kit?: string | undefined) {
  const points = kit ? kitPoints(p.tiers[kit], p.bonuses[kit] ?? 0, p.tierLP[kit]) : p.points;
  const syncedLP = kit ? p.synced?.[kit]?.lp : null;
  return { points, displayLP: syncedLP != null ? syncedLP : points };
}

// Bigger card for the top three players (1 in the middle on wide screens).
function PodiumCard({ p, i, kit, delta }: { p: LadderPlayer; i: number; kit?: string | undefined; delta?: RankDelta }) {
  const { displayLP } = lpInfo(p, kit);
  const first = i === 0;
  const byTier = compareKitsByTier(p.tiers, p.bonuses, p.tierLP);
  const chips = kit ? [kit] : Object.keys(p.tiers).sort(byTier);
  const frame = first ? "border-gold/60 bg-gold/5 py-6 md:order-2 md:pb-9 shadow-glow"
    : i === 1 ? "border-silver/40 bg-silver/5 py-5 md:order-1" : "border-bronze/40 bg-bronze/5 py-5 md:order-3";
  const badge = first ? "bg-gold" : i === 1 ? "bg-silver" : "bg-bronze";
  return (
    <PlayerLink playerId={p.id}
      className={`flex flex-col items-center rounded-2xl border px-4 text-center transition-colors hover:bg-accent ${frame}`}>
      <span className={`rounded-lg px-4 py-0.5 font-display text-xl font-black text-background ${badge}`}>{i + 1}</span>
      <Avatar p={p} className={`mt-3 ${first ? "h-36" : "h-28"}`} />
      <span className="mt-2 max-w-full truncate font-display text-xl font-bold">{p.username}</span>
      <span className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">◆ {displayLP == null ? "-" : `${displayLP} LP`}</span>
        <span className={`rounded-md px-1.5 font-display text-xs font-bold ${regionClass(p.region)}`}>{p.region}</span>
        <RankChangeChip delta={delta ?? null} />
      </span>
      {chips.length > 0 && (
        <div className="mt-3 flex w-full flex-wrap justify-center gap-2 rounded-lg bg-background/60 p-3">
          {chips.map((k) => <TierChip key={k} kitId={k} tier={p.tiers[k]} />)}
        </div>
      )}
    </PlayerLink>
  );
}

function Row({ p, i, kit, delta }: { p: LadderPlayer; i: number; kit?: string | undefined; delta?: RankDelta }) {
  const { points, displayLP } = lpInfo(p, kit);
  const bonus = kit ? (isLowerTier(p.tiers[kit]) ? 0 : p.bonuses[kit] ?? 0) : Object.entries(p.bonuses).reduce((sum, [id, value]) => sum + (isLowerTier(p.tiers[id]) ? 0 : value), 0);
  const byTier = compareKitsByTier(p.tiers, p.bonuses, p.tierLP);
  const sorted = Object.entries(p.tiers).sort((a, b) => byTier(a[0], b[0]));

  const ladder = useLadderConfig();
  const unranked = ladder.kits.filter((k) => !p.tiers[k.id]).map((k) => [k.id, undefined] as const);
  return (
    <PlayerLink
      playerId={p.id}
      className="group flex items-stretch overflow-hidden rounded-lg border bg-row transition-colors hover:bg-accent"
    >
      <div className={`relative flex w-32 shrink-0 items-center rank-slant ${rankBg(i)}`}>
        <span className="pl-4 font-display text-3xl font-black italic text-foreground drop-shadow">{i + 1}.</span>
        <Avatar p={p} className="absolute bottom-0 right-5 h-14" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3 md:w-64 md:flex-none">
        <span className="truncate font-display text-xl font-bold">{p.username}</span>
        <span className="text-xs font-semibold text-muted-foreground">
          <span className="text-primary">◆</span> <span title={`Base: ${points - bonus} LP · Bonus: ${bonus > 0 ? "+" : ""}${bonus} LP`}>{displayLP == null ? "-" : `${displayLP} LP`}</span>
          <RankChangeChip delta={delta ?? null} className="ml-2" />
        </span>
      </div>
      <div className="flex items-center border-x px-4">
        <span className={`rounded-md px-2.5 py-1 font-display text-lg font-bold ${regionClass(p.region)}`}>{p.region}</span>
      </div>
      <div className={`${kit ? "flex" : "hidden lg:flex"} flex-1 flex-wrap items-center justify-center gap-2 px-4 py-2`}>
        {kit ? (
          <TierChip kitId={kit} tier={p.tiers[kit]} />
        ) : (
          [...sorted, ...unranked].map(([k, t]) => <TierChip key={k} kitId={k} tier={t} />)
        )}
      </div>
    </PlayerLink>
  );
}

export function Rankings({ kit, q, ladder = PVP_LADDER }: { kit?: string | undefined; q?: string | undefined; ladder?: LadderConfig }) {
  const { data, isLoading, error } = useQuery({ ...ladderQueryOf(ladder), refetchInterval: 15000 });
  const { data: baseline } = useQuery({ ...rankBaselineQuery, enabled: ladder.features.rankArrows });
  const list = kit ? sortKit(data ?? [], kit) : sortOverall(data ?? []);
  const baselineMap = kit ? baseline?.kits[kit] : baseline?.overall;

  const ranked = list.map((p, i) => ({ p, i }));
  const shown = q ? ranked.filter(({ p }) => p.username.toLowerCase().includes(q.toLowerCase())) : ranked;
  // The top three get big podium cards, except while searching.
  const showPodium = !q && !isLoading && !error && shown.length >= 3;
  const podium = showPodium ? shown.slice(0, 3) : [];
  const rest = showPodium ? shown.slice(3) : shown;

  return (
    <LadderProvider ladder={ladder}>
    <div className={`min-h-screen px-4 pb-16 ${themeClass(ladder)}`}>
      <Header />
      <main className="mx-auto mt-8 max-w-6xl rounded-xl border bg-panel p-5">
        <KitTabs kit={kit} />
        {podium.length === 3 && (
          <div className="mt-6 grid items-end gap-3 md:grid-cols-3">
            {podium.map(({ p, i }) => <PodiumCard key={p.id} p={p} i={i} kit={kit} delta={rankDelta(baselineMap, p.id, i + 1)} />)}
          </div>
        )}
        {rest.length > 0 && (
          <div className="mt-4 hidden grid-cols-[8rem_16rem_6rem_1fr] px-4 pb-2 text-sm font-semibold text-muted-foreground lg:grid">
            <span className="pl-4">#</span><span className="pl-4">Player</span><span>Region</span><span className="text-center">Tiers</span>
          </div>
        )}
        <div className={`space-y-2 ${podium.length === 3 ? "mt-3" : ""}`}>
          {isLoading && <p className="py-10 text-center text-muted-foreground">Loading rankings…</p>}
          {error && <p className="py-10 text-center text-destructive">Couldn't load rankings.</p>}
          {!isLoading && shown.length === 0 && <p className="py-10 text-center text-muted-foreground">No players found.</p>}
          {rest.map(({ p, i }) => <Row key={p.id} p={p} i={i} kit={kit} delta={rankDelta(baselineMap, p.id, i + 1)} />)}
        </div>
      </main>
    </div>
    </LadderProvider>
  );
}
