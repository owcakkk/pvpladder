import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KitIcon } from "./KitIcon";
import { BonusEditor } from "./BonusEditor";
import { CategoryEditor, numericCategories } from "./CategoryEditor";
import { TIERS, LP_RANGES, isLowerTier, tierForLP, validateTierLP, tierBadgeClass, type Kit } from "@/lib/kits";
import { setTier } from "@/lib/staff.functions";

export function TierEditor({ playerId, kit, tier, lp, bonus, categories, refresh }: {
  playerId: string; kit: Kit; tier?: string | undefined; lp: number | null; bonus: number; categories?: unknown; refresh: () => Promise<unknown>;
}) {
  // Show the category editor for LT3-LT5 kits: bot-synced ones with numeric categories,
  // and manually added ones that have no categories yet.
  const editableCategories = tier && isLowerTier(tier) && categories != null ? numericCategories(categories) : null;
  const canEditCategories = !!tier && isLowerTier(tier) && (categories == null || editableCategories != null);
  const [selected, setSelected] = useState(tier ?? "");
  const [value, setValue] = useState(lp == null ? "" : String(lp));
  const [busy, setBusy] = useState(false);
  const save = useServerFn(setTier);
  const lower = isLowerTier(selected);
  const range = LP_RANGES.find((r) => r.tier === selected);
  const submit = async () => {
    setBusy(true);
    try {
      const points = lower && value !== "" ? Number(value) : null;
      validateTierLP(selected, points);
      await save({ data: { playerId, kit: kit.id, tier: selected, tierLP: points } });
      await refresh(); toast.success("Tier and LP saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save tier"); }
    finally { setBusy(false); }
  };
  return (
    <div className="rounded-md bg-background p-2 text-xs">
      <div className="flex items-center gap-2">
        <KitIcon kit={kit} className={`h-4 w-4 shrink-0 ${kit.tone}`} />
        <span className="flex-1 truncate">{kit.name}</span>
        <select aria-label={`${kit.name} tier`} value={selected} disabled={busy}
          onChange={(e) => { setSelected(e.target.value); if (e.target.value !== selected) setValue(""); }}
          className={`rounded px-1 py-0.5 font-display font-bold ${tierBadgeClass(selected)}`}>
          <option value="">—</option>{TIERS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <Button size="icon" variant="ghost" className="h-7 w-7" title="Save tier and LP"
          aria-label={`${kit.name} save tier and LP`} disabled={busy || (lower && value === "")} onClick={submit}><Check /></Button>
      </div>
      {lower && <label className="mt-2 flex items-center gap-2 text-muted-foreground">
        <span>Tier LP</span>
        <input aria-label={`${kit.name} tier LP`} type="number" min={0} max={400} step={1} value={value} disabled={busy}
          onChange={(e) => { setValue(e.target.value); const n = Number(e.target.value); if (e.target.value !== "" && Number.isInteger(n) && n >= 0 && n <= 400) setSelected(tierForLP(n)); }}
          className="min-w-0 w-20 rounded border bg-background px-2 py-1 text-foreground" />
        <span>{range?.min}–{range?.max} LP</span>
      </label>}
      {canEditCategories && lower && selected === tier && <CategoryEditor key={JSON.stringify(categories ?? null)} playerId={playerId} kit={kit.id} categories={editableCategories} currentLP={lp} refresh={refresh} />}
      {!lower && selected && <BonusEditor playerId={playerId} kit={kit.id} bonus={bonus} disabled={!tier || isLowerTier(tier)} refresh={refresh} />}
    </div>
  );
}