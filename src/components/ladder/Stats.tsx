import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "./Header";
import { KitIcon } from "./KitIcon";
import { Avatar } from "./Rankings";
import { ladderQuery } from "@/lib/ladder";
import { KITS, TIERS, regionClass, tierBadgeClass } from "@/lib/kits";
import { sortKit } from "@/lib/ranking";
import { regionCounts, tierDistribution } from "@/lib/stats";

// Static class names so Tailwind can see them.
const cellBg = (tier: string) => {
  const n = tier[2];
  return n === "1" ? "bg-gold/25" : n === "2" ? "bg-silver/25" : n === "3" ? "bg-bronze/25" : "bg-low/40";
};

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-row px-4 py-3">
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="block font-display text-3xl font-black">{value}</span>
      {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function Stats() {
  const { data: players = [], isLoading, error } = useQuery(ladderQuery);
  const { byKit, kitTotals, tierTotals } = tierDistribution(players);
  const regions = regionCounts(players);
  const rankedPlayers = players.filter((p) => Object.keys(p.tiers).length > 0).length;
  const entries = Object.values(kitTotals).reduce((sum, n) => sum + n, 0);
  const busiestKit = KITS.reduce((best, k) => ((kitTotals[k.id] ?? 0) > (kitTotals[best.id] ?? 0) ? k : best), KITS[0]!);
  const maxTier = Math.max(1, ...Object.values(tierTotals));
  const leaders = KITS.flatMap((k) => { const top = sortKit(players, k.id)[0]; return top ? [{ k, top }] : []; });

  return (
    <div className="min-h-screen px-4 pb-16">
      <Header />
      <main className="mx-auto mt-8 max-w-6xl space-y-6">
        <h1 className="font-display text-2xl font-black">Statistics</h1>
        {isLoading && <p className="py-10 text-center text-muted-foreground">Loading statistics…</p>}
        {error && <p className="py-10 text-center text-destructive">Couldn't load statistics.</p>}

        {!isLoading && !error && (<>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard label="Players" value={players.length} hint={`${rankedPlayers} with at least one tier`} />
            <SummaryCard label="Kit entries" value={entries} hint="Tiers assigned across all kits" />
            <SummaryCard label="Busiest kit" value={busiestKit.name} hint={`${kitTotals[busiestKit.id] ?? 0} players`} />
            <div className="rounded-lg border bg-row px-4 py-3">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Regions</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {regions.map(([region, count]) => (
                  <span key={region} className={`rounded-md px-2 py-0.5 font-display text-sm font-bold ${regionClass(region)}`}>{region} {count}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-panel p-5">
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Players per tier in each kit</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-separate border-spacing-y-1 text-center text-sm">
                <thead>
                  <tr>
                    <th className="px-2 text-left text-xs font-semibold text-muted-foreground">Kit</th>
                    {TIERS.map((t) => (
                      <th key={t} className="px-1"><span className={`inline-block min-w-11 rounded-md px-1.5 font-display text-xs font-bold ${tierBadgeClass(t)}`}>{t}</span></th>
                    ))}
                    <th className="px-2 text-xs font-semibold text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {KITS.map((k) => (
                    <tr key={k.id} className="bg-row">
                      <td className="rounded-l-lg px-2 py-1.5 text-left">
                        <Link to="/rankings/$kit" params={{ kit: k.id }} className="flex items-center gap-2 font-display font-bold hover:text-primary">
                          <KitIcon kit={k} className={`h-5 w-5 ${k.tone}`} /> {k.name}
                        </Link>
                      </td>
                      {TIERS.map((t) => {
                        const n = byKit[k.id]?.[t] ?? 0;
                        return <td key={t} className={n > 0 ? `font-display font-bold ${cellBg(t)}` : "text-muted-foreground/50"}>{n > 0 ? n : "–"}</td>;
                      })}
                      <td className="rounded-r-lg px-2 font-display font-black">{kitTotals[k.id] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border bg-panel p-5">
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Tier spread across all kits</h2>
            <div className="space-y-1.5">
              {TIERS.map((t) => {
                const n = tierTotals[t] ?? 0;
                return (
                  <div key={t} className="flex items-center gap-3">
                    <span className={`w-12 rounded-md px-1.5 text-center font-display text-xs font-bold ${tierBadgeClass(t)}`}>{t}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-row">
                      <div className={`h-full ${tierBadgeClass(t).split(" ")[0]}`} style={{ width: `${(n / maxTier) * 100}%` }} />
                    </div>
                    <span className="w-10 text-right font-display text-sm font-bold">{n}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {leaders.length > 0 && (
            <section className="rounded-xl border bg-panel p-5">
              <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Kit leaders</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {leaders.map(({ k, top }) => (
                  <Link key={k.id} to="/players/$playerId" params={{ playerId: top.id }} className="flex items-center gap-3 rounded-lg border bg-row px-4 py-2 hover:bg-accent">
                    <Avatar p={top} className="h-12 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-display font-bold">{top.username}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><KitIcon kit={k} className={`h-4 w-4 ${k.tone}`} /> {k.name}</span>
                    </div>
                    <span className={`rounded-md px-1.5 font-display text-xs font-bold ${tierBadgeClass(top.tiers[k.id])}`}>{top.tiers[k.id]}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>)}
      </main>
    </div>
  );
}
