import { KitIcon } from "./KitIcon";
import { KITS } from "@/lib/kits";
import type { RankDelta } from "@/lib/ranking";

// Small arrow shown next to a rank: green up, red down, blue NEW. Nothing when unchanged.
export function RankChangeChip({ delta, className = "" }: { delta: RankDelta; className?: string }) {
  if (!delta) return null;
  if (delta.kind === "new") {
    return <span title="New since the last daily snapshot" className={`rounded bg-sky-400/15 px-1 text-[10px] font-black uppercase tracking-wide text-sky-400 ${className}`}>New</span>;
  }
  const up = delta.kind === "up";
  return (
    <span title={`${up ? "Up" : "Down"} ${delta.by} since the last daily snapshot`} aria-label={`${up ? "Up" : "Down"} ${delta.by}`}
      className={`font-display text-xs font-black ${up ? "text-emerald-400" : "text-red-400"} ${className}`}>
      {up ? "▲" : "▼"}{delta.by}
    </span>
  );
}

const rankClass = (rank: number) =>
  rank === 1 ? "bg-rank-1" : rank === 2 ? "bg-rank-2" : rank === 3 ? "bg-rank-3" : "bg-rank-n";

// Profile badge: "#3 Overall" or "#1 Sword" (with the kit icon).
export function RankBadge({ rank, label, kitId, delta }: { rank: number; label: string; kitId?: string; delta?: RankDelta }) {
  const kit = kitId ? KITS.find((k) => k.id === kitId) : undefined;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-display text-sm font-bold ${rankClass(rank)}`}>
      {kit && <KitIcon kit={kit} className="h-4 w-4" />}
      <span>#{rank}</span>
      <span className="font-semibold opacity-90">{label}</span>
      {delta && <RankChangeChip delta={delta} />}
    </span>
  );
}
