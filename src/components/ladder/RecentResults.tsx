import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { KitIcon } from "./KitIcon";
import { avatarFallback, avatarUrl, tierBadgeClass } from "@/lib/kits";
import { useLadderConfig } from "@/lib/ladder-context";
import type { LadderPlayer } from "@/lib/ladder-build";
import { buildRecentResults, recentHistoryQuery, timeAgo } from "@/lib/recent-results";

const LIMIT = 12;

function MiniAvatar({ p }: { p: { username: string; mc_uuid: string | null } }) {
  return (
    <img src={avatarUrl(p.username, p.mc_uuid)} alt="" loading="lazy" className="h-6 w-6 shrink-0 object-contain"
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.dataset["fb"]) { img.dataset["fb"] = "1"; img.src = avatarFallback(p.username, p.mc_uuid); }
      }} />
  );
}

// "Recently tested" strip shown right under the header: the newest results, scrolling sideways.
// On a kit tab it only shows that kit. Renders nothing while there are no results.
export function RecentResults({ players, kit }: { players: LadderPlayer[]; kit?: string | undefined }) {
  const ladder = useLadderConfig();
  const { data: rows = [] } = useQuery(recentHistoryQuery);
  const byId = new Map(players.map((p) => [p.id, p]));
  const results = buildRecentResults(rows, new Set(byId.keys()), LIMIT, kit);
  if (results.length === 0) return null;
  return (
    <section aria-label="Recently tested" className="recent-strip mx-auto mt-3 flex max-w-6xl items-center gap-3 rounded-xl border bg-panel px-4 py-2">
      <span className="flex shrink-0 items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Clock className="h-3.5 w-3.5 text-primary" /> Recently tested
      </span>
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
        {results.map((r) => {
          const p = byId.get(r.playerId)!;
          const k = ladder.kits.find((x) => x.id === r.kit);
          const body = (
            <>
              <MiniAvatar p={p} />
              <span className="max-w-28 truncate font-display font-bold">{p.username}</span>
              {k && <KitIcon kit={k} className={`h-4 w-4 shrink-0 ${k.tone}`} />}
              {r.previousTier && r.previousTier !== r.tier && (
                <>
                  <span className={`rounded px-1 font-display text-[10px] font-bold ${tierBadgeClass(r.previousTier)}`}>{r.previousTier}</span>
                  <span className="text-muted-foreground">→</span>
                </>
              )}
              <span className={`rounded px-1 font-display text-[10px] font-bold ${tierBadgeClass(r.tier)}`}>{r.tier}</span>
              <span className="text-muted-foreground">{timeAgo(r.achievedAt)}</span>
            </>
          );
          const className = "flex shrink-0 items-center gap-1.5 rounded-lg border bg-row px-2.5 py-1 text-xs";
          const key = `${r.playerId}-${r.kit}-${r.achievedAt}`;
          return ladder.features.profiles
            ? <Link key={key} to="/players/$playerId" params={{ playerId: r.playerId }} className={`${className} hover:bg-accent`} title={k ? `${k.name} · ${r.tier}` : r.tier}>{body}</Link>
            : <div key={key} className={className}>{body}</div>;
        })}
      </div>
    </section>
  );
}
