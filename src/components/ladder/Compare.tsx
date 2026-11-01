import { useNavigate, useSuspenseQuery } from "@tanstack/react-query";
import { Swords } from "lucide-react";
import { Header } from "./Header";
import { KitIcon } from "./KitIcon";
import { Avatar } from "./Rankings";
import { ladderQuery, type LadderPlayer } from "@/lib/ladder";
import {
  KITS, isLowerTier, kitPoints, regionClass, tierBadgeClass, tierRingClass, type Tier,
} from "@/lib/kits";

function Side({ p, kitId, winner, reverse }: { p?: LadderPlayer | undefined; kitId: string; winner: boolean; reverse?: boolean }) {
  const k = KITS.find((x) => x.id === kitId)!;
  const tier = p?.tiers[kitId] as Tier | undefined;
  const bonus = tier && !isLowerTier(tier) ? p?.bonuses[kitId] ?? 0 : 0;
  const pts = p ? kitPoints(tier, bonus, p.tierLP[kitId]) : null;
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${reverse ? "flex-row-reverse text-right" : ""}`}>
      <div className={`min-w-0 ${reverse ? "text-right" : ""}`}>
        <span className={`block font-display text-lg leading-tight ${pts == null ? "text-muted-foreground" : winner ? "font-black text-primary" : "font-bold"}`}>
          {pts == null ? "—" : `${pts} LP`}
        </span>
        <span className="block truncate text-xs font-semibold text-muted-foreground">
          {p
            ? tier
              ? isLowerTier(tier)
                ? `${p.tierLP[kitId] ?? 0} tier LP`
                : bonus !== 0
                  ? `${bonus > 0 ? "+" : ""}${bonus} bonus LP`
                  : `${tier} tier`
              : "No tier yet"
            : "Not selected"}
        </span>
      </div>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background ring-2 ${tier ? tierRingClass(tier) : "ring-low opacity-50"}`}>
        <KitIcon kit={k} className={`h-4.5 w-4.5 ${k.tone}`} />
      </span>
      <span className={`shrink-0 rounded-md px-1.5 text-center font-display text-xs font-bold ${tierBadgeClass(tier)}`}>
        {tier ?? "—"}
      </span>
    </div>
  );
}

function KitRow({ kitId, p1, p2 }: { kitId: string; p1?: LadderPlayer | undefined; p2?: LadderPlayer | undefined }) {
  const k = KITS.find((x) => x.id === kitId)!;
  const val = (p: LadderPlayer | undefined) => (p ? kitPoints(p.tiers[kitId] as Tier | undefined, p.bonuses[kitId] ?? 0, p.tierLP[kitId]) : null);
  const v1 = val(p1);
  const v2 = val(p2);
  const winner1 = v1 != null && (v2 == null || v1 > v2);
  const winner2 = v2 != null && (v1 == null || v2 > v1);
  const delta = v1 != null && v2 != null ? v1 - v2 : null;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border bg-row px-3 py-2">
      <Side p={p1} kitId={kitId} winner={winner1} />
      <div className="flex flex-col items-center gap-0.5 px-1">
        <KitIcon kit={k} className={`h-6 w-6 ${k.tone}`} />
        <span className="text-center font-display text-xs font-bold text-muted-foreground">{k.name}</span>
        {delta != null && delta !== 0 && (
          <span className="font-display text-[10px] font-bold text-primary">+{Math.abs(delta)} LP</span>
        )}
        {delta === 0 && <span className="font-display text-[10px] font-bold text-muted-foreground">Tie</span>}
      </div>
      <Side p={p2} kitId={kitId} winner={winner2} reverse />
    </div>
  );
}

function OverallCard({ p, leading, gap }: { p?: LadderPlayer | undefined; leading: boolean; gap: number }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border bg-row p-4 ${leading ? "ring-2 ring-gold" : ""}`}>
      {p ? (
        <>
          <Avatar p={p} className="h-16 shrink-0" />
          <div className="min-w-0">
            <span className="block truncate font-display text-lg font-bold">{p.username}</span>
            <span className={`inline-block rounded-md px-2 py-0.5 font-display text-xs font-bold ${regionClass(p.region)}`}>{p.region}</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`font-display text-2xl font-black ${leading ? "text-primary" : ""}`}>◆ {p.points} LP</span>
            </div>
            {leading && gap > 0 && <span className="text-xs font-semibold text-primary">+{gap} LP ahead</span>}
          </div>
        </>
      ) : (
        <span className="text-sm text-muted-foreground">Select a player…</span>
      )}
    </div>
  );
}

export function ComparePage({ a, b }: { a?: string | undefined; b?: string | undefined }) {
  const { data: players } = useSuspenseQuery(ladderQuery);
  const navigate = useNavigate();
  const pa = players.find((p) => p.id === a);
  const pb = players.find((p) => p.id === b);
  const sorted = [...players].sort((x, y) => y.points - x.points || x.username.localeCompare(y.username));
  const gap = pa && pb ? pa.points - pb.points : 0;

  const picker = (value: string | undefined, key: "a" | "b", label: string) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => navigate({ to: "/compare", search: (prev: { a?: string; b?: string }) => ({ ...prev, [key]: e.target.value || undefined }) })}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Select player…</option>
        {sorted.map((p) => <option key={p.id} value={p.id}>{p.username} — {p.points} LP</option>)}
      </select>
    </label>
  );

  return (
    <div className="min-h-screen px-4 pb-16">
      <Header />
      <main className="mx-auto mt-8 max-w-5xl">
        <h1 className="mb-4 flex items-center gap-2 font-display text-2xl font-black">
          <Swords className="h-6 w-6 text-primary" /> Compare players
        </h1>
        <div className="flex flex-col gap-3 rounded-xl border bg-panel p-4 sm:flex-row">
          {picker(pa?.id, "a", "Player one")}
          <div className="hidden items-center pt-6 sm:flex"><span className="font-display font-black text-muted-foreground">vs</span></div>
          {picker(pb?.id, "b", "Player two")}
        </div>

        {pa && pb && (
          <>
            <section className="mt-6 grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <OverallCard p={pa} leading={gap > 0} gap={gap} />
              <div className="hidden items-center justify-center sm:flex">
                <span className="font-display text-xl font-black text-muted-foreground">VS</span>
              </div>
              <OverallCard p={pb} leading={gap < 0} gap={-gap} />
            </section>
            {gap === 0 && (
              <p className="mt-2 text-center text-sm font-semibold text-muted-foreground">Overall LP is tied.</p>
            )}
            <section className="mt-4 rounded-xl border bg-panel p-4">
              <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Kit by kit</h2>
              <div className="space-y-2">
                {KITS.map((k) => (
                  <KitRow key={k.id} kitId={k.id} p1={pa} p2={pb} />
                ))}
              </div>
            </section>
          </>
        )}
        {(!pa || !pb) && (
          <p className="mt-6 rounded-xl border bg-panel p-6 text-center text-muted-foreground">
            Pick two players above to compare their tiers and Ladder Points across every kit.
          </p>
        )}
      </main>
    </div>
  );
}
