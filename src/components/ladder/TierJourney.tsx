import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KitIcon } from "./KitIcon";
import { TIERS, type Kit, type Tier } from "@/lib/kits";
import { journeyStats, tierHistoryQuery } from "@/lib/tier-history";

// Static class names so Tailwind generates them.
const fillFor = (tier: string) => {
  const n = tier[2];
  return n === "1" ? "fill-gold" : n === "2" ? "fill-silver" : n === "3" ? "fill-bronze" : "fill-low";
};
const bgFor = (tier: string) => {
  const n = tier[2];
  return n === "1" ? "bg-gold" : n === "2" ? "bg-silver" : n === "3" ? "bg-bronze" : "bg-low";
};

const W = 640, H = 340, PAD_L = 56, PAD_R = 28, PAD_T = 20, PAD_B = 40;
const yFor = (tier: Tier) => PAD_T + (TIERS.indexOf(tier) * (H - PAD_T - PAD_B)) / (TIERS.length - 1);
const dateOf = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { timeZone: "UTC" });
const LEGEND: Array<[string, Tier]> = [["HT1", "HT1"], ["LT1", "LT1"], ["HT2", "HT2"], ["LT2", "LT2"], ["HT3", "HT3"], ["LT3", "LT3"], ["HT4-LT5", "LT4"]];

export function TierJourneyDialog({ playerId, playerName, kit, onClose }: { playerId: string; playerName: string; kit: Kit; onClose: () => void }) {
  const { data: points = [], isLoading } = useQuery(tierHistoryQuery(playerId, kit.id));
  const [picked, setPicked] = useState<number | null>(null);
  const { peak, current, count } = journeyStats(points);
  const n = points.length;
  const xFor = (i: number) => (n === 1 ? W / 2 : PAD_L + (i * (W - PAD_L - PAD_R)) / (n - 1));
  const selected = points[picked ?? n - 1];
  const labelEvery = Math.max(1, Math.ceil(n / 7));
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-display text-xl font-black">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-row"><KitIcon kit={kit} className={`h-5 w-5 ${kit.tone}`} /></span>
            {kit.name} Tier Journey
          </DialogTitle>
          <DialogDescription>{playerName}</DialogDescription>
        </DialogHeader>

        {isLoading && <p className="py-10 text-center text-muted-foreground">Loading history…</p>}
        {!isLoading && n === 0 && (
          <p className="py-10 text-center text-muted-foreground">No history recorded yet. Results show up here as tests are synced or tiers are changed.</p>
        )}
        {n > 0 && (<>
          <div className="rounded-lg border bg-row px-4 py-3">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Peak &amp; current</span>
            <span className="mt-1 block font-display font-bold">
              Peak <span className="text-primary">{peak}</span> · Now <span className="text-primary">{current}</span> · {count} result{count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="rounded-lg border bg-background/60 p-2">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${kit.name} tier history of ${playerName}`}>
              {TIERS.map((t) => (
                <g key={t}>
                  <line x1={PAD_L} x2={W - PAD_R} y1={yFor(t)} y2={yFor(t)} className="stroke-foreground/10" strokeWidth={1} />
                  <text x={PAD_L - 10} y={yFor(t) + 4} textAnchor="end" fontSize={12} fontWeight={700} className={fillFor(t)}>{t}</text>
                </g>
              ))}
              {n > 1 && <polyline points={points.map((p, i) => `${xFor(i)},${yFor(p.tier)}`).join(" ")} fill="none" className="stroke-primary/60" strokeWidth={3} strokeLinejoin="round" />}
              {points.map((p, i) => (
                <g key={`${p.achievedAt}-${i}`}>
                  {i % labelEvery === 0 && <text x={xFor(i)} y={H - 14} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-muted-foreground">{dateOf(p.achievedAt)}</text>}
                  <circle cx={xFor(i)} cy={yFor(p.tier)} r={picked === i || (picked == null && i === n - 1) ? 11 : 9}
                    className={`${fillFor(p.tier)} cursor-pointer stroke-foreground/70`} strokeWidth={picked === i || (picked == null && i === n - 1) ? 2 : 0}
                    tabIndex={0} role="button" aria-label={`${p.tier} on ${dateOf(p.achievedAt)}`}
                    onClick={() => setPicked(i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setPicked(i); }} />
                </g>
              ))}
            </svg>
          </div>
          {selected && (
            <p className="text-center text-sm text-muted-foreground">
              <span className={`mr-1.5 rounded-md px-1.5 font-display text-xs font-bold text-background ${bgFor(selected.tier)}`}>{selected.tier}</span>
              {dateOf(selected.achievedAt)} · {selected.source === "staff" ? "set by staff" : "test result"}
              {n > 1 && " · click a dot to see another result"}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-bold text-muted-foreground">
            {LEGEND.map(([label, tier]) => (
              <span key={label} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${bgFor(tier)}`} />{label}</span>
            ))}
          </div>
        </>)}
      </DialogContent>
    </Dialog>
  );
}
