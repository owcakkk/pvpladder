import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recentUsernameChanges } from "@/lib/staff.functions";
import { ladderQuery } from "@/lib/ladder";
import { playerForUsernameChange } from "@/lib/username-history";
import { KITS, compareKitsByTier, kitPoints, tierBadgeClass } from "@/lib/kits";
import { KitIcon } from "./KitIcon";

export function UsernameChanges({ active }: { active: boolean }) {
  const readChanges = useServerFn(recentUsernameChanges);
  const history = useQuery({ queryKey: ["staff", "username-changes"], queryFn: () => readChanges(), enabled: active });
  const ladder = useQuery(ladderQuery);
  const [filter, setFilter] = useState("");
  const search = filter.trim().toLowerCase();
  const changes = (history.data ?? []).filter((change) =>
    [change.old_username, change.new_username, change.mc_uuid].some((value) => value.toLowerCase().includes(search)));
  return (
    <section className="py-2">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Recent username changes</h2>
        <div className="flex min-w-0 items-center gap-2">
          <input aria-label="Filter username changes" placeholder="Name or UUID…" value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="min-w-0 w-56 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <Button variant="outline" size="icon" aria-label="Refresh username changes" title="Refresh username changes"
            disabled={history.isFetching} onClick={() => { void history.refetch(); void ladder.refetch(); }}>
            <RefreshCw className={history.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
          </Button>
        </div>
      </div>
      {history.isLoading && <p className="py-8 text-muted-foreground">Loading username changes…</p>}
      {(history.error || ladder.error) && <p role="alert" className="py-4 text-destructive">Couldn't load username changes or current scores.</p>}
      {history.data && changes.length === 0 && <p className="py-8 text-muted-foreground">{search ? "No matching changes." : "No username changes recorded yet."}</p>}
      <div className="space-y-3">
        {changes.map((change) => {
          const player = playerForUsernameChange(change, ladder.data ?? []);
          const kits = player ? [...KITS].filter((kit) => player.tiers[kit.id]).sort((a, b) => compareKitsByTier(player.tiers, player.bonuses, player.tierLP)(a.id, b.id)) : [];
          return (
            <article key={change.id} className="rounded-lg border bg-row p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-display text-lg font-bold">
                    <span className="break-all text-muted-foreground">{change.old_username}</span>
                    <ArrowRight aria-label="changed to" className="h-4 w-4 shrink-0 text-primary" />
                    {player ? <Link to="/players/$playerId" params={{ playerId: player.id }} className="break-all text-primary hover:underline">{change.new_username}</Link> : <span className="break-all">{change.new_username}</span>}
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">UUID: {change.mc_uuid}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{change.source_table === "players" ? "Ladder" : "Tournament"} · <time dateTime={change.changed_at}>{new Date(change.changed_at).toLocaleString()}</time></p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold text-primary">{player ? `${player.points} LP` : "—"}</p>
                  <p className="text-xs text-muted-foreground">{player ? "Current total" : ladder.isLoading ? "Loading scores…" : "Not on ladder"}</p>
                </div>
              </div>
              {player && <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                {kits.length === 0 && <span className="text-sm text-muted-foreground">No assigned tiers.</span>}
                {kits.map((kit) => <div key={kit.id} className="flex items-center gap-2 text-xs">
                  <KitIcon kit={kit} className="h-5 w-5" />
                  <span>{kit.name}</span>
                  <span className={`rounded px-1.5 py-0.5 font-bold ${tierBadgeClass(player.tiers[kit.id])}`}>{player.tiers[kit.id]}</span>
                  <span className="mr-2 text-muted-foreground">{kitPoints(player.tiers[kit.id], player.bonuses[kit.id] ?? 0, player.tierLP[kit.id])} LP</span>
                </div>)}
              </div>}
            </article>
          );
        })}
      </div>
      {history.data && history.data.length >= 100 && <p className="mt-4 text-xs text-muted-foreground">Latest 100 changes</p>}
    </section>
  );
}