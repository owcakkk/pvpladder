import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KIT_CATEGORIES, tierForLP } from "@/lib/kits";
import { setCategoryPoints } from "@/lib/staff.functions";

// Returns the categories as numbers, or null when they can't be edited safely.
export function numericCategories(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0 || !entries.every(([, v]) => typeof v === "number" && Number.isFinite(v))) return null;
  return Object.fromEntries(entries) as Record<string, number>;
}

type Row = { name: string; value: string };

export function CategoryEditor({ playerId, kit, categories, currentLP, refresh }: {
  playerId: string; kit: string; categories: Record<string, number> | null; currentLP: number | null; refresh: () => Promise<unknown>;
}) {
  const manual = categories == null;
  const [rows, setRows] = useState<Row[]>(
    categories
      ? Object.entries(categories).map(([name, v]) => ({ name, value: String(v) }))
      : (KIT_CATEGORIES[kit] ?? []).map((name) => ({ name, value: "0" })),
  );
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const save = useServerFn(setCategoryPoints);
  const parsed = rows.map((r) => [r.name, r.value.trim() === "" ? NaN : Number(r.value)] as const);
  const valid = rows.length > 0 && parsed.every(([, n]) => Number.isInteger(n) && n >= 0);
  const total = valid ? parsed.reduce((sum, [, n]) => sum + n, 0) : null;
  const nextTier = total != null && total <= 400 ? tierForLP(total) : null;
  const setValue = (name: string, value: string) =>
    setRows((current) => current.map((r) => (r.name === name ? { ...r, value } : r)));
  const step = (name: string, delta: number) =>
    setRows((current) => current.map((r) => (r.name === name ? { ...r, value: String(Math.max(0, (Number(r.value) || 0) + delta)) } : r)));
  const addCategory = () => {
    const name = newName.trim().slice(0, 40);
    if (!name) return;
    if (rows.some((r) => r.name.toLowerCase() === name.toLowerCase())) { toast.error("That category already exists"); return; }
    if (rows.length >= 20) { toast.error("Too many categories"); return; }
    setRows((current) => [...current, { name, value: "0" }]);
    setNewName("");
  };
  const submit = async () => {
    if (!valid || total == null || total > 400) return;
    setBusy(true);
    try {
      await save({ data: { playerId, kit, categories: Object.fromEntries(parsed) } });
      await refresh();
      toast.success("Category LP saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't save category LP"); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-2 space-y-1 border-t pt-2">
      {manual && <p className="text-muted-foreground">
        No categories yet{currentLP != null ? ` (Tier LP is ${currentLP})` : ""}. Saving replaces the Tier LP with the category total.
      </p>}
      {rows.map(({ name, value }) => (
        <div key={name} className="flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{name}</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`${name} minus 5`} disabled={busy} onClick={() => step(name, -5)}><Minus /></Button>
          <input aria-label={`${kit} ${name} LP`} type="number" min={0} step={1} value={value} disabled={busy}
            onChange={(e) => setValue(name, e.target.value)}
            className="w-14 min-w-0 rounded border bg-background px-1 py-0.5 text-foreground" />
          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`${name} plus 5`} disabled={busy} onClick={() => step(name, 5)}><Plus /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" title="Remove category" aria-label={`Remove ${name}`} disabled={busy}
            onClick={() => setRows((current) => current.filter((r) => r.name !== name))}><X /></Button>
        </div>
      ))}
      <div className="flex items-center gap-1 pt-1">
        <input aria-label={`${kit} new category name`} type="text" maxLength={40} placeholder="Add category…" value={newName} disabled={busy}
          onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }}
          className="min-w-0 flex-1 rounded border bg-background px-1 py-0.5 text-foreground" />
        <Button size="icon" variant="ghost" className="h-6 w-6" title="Add category" aria-label={`${kit} add category`}
          disabled={busy || newName.trim() === ""} onClick={addCategory}><Plus /></Button>
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className={total != null && total > 400 ? "text-destructive" : "text-muted-foreground"}>
          {rows.length === 0 ? "Add a category to start" : total == null ? "Enter whole numbers" : total > 400 ? `Total ${total} LP — max 400` : `Total ${total} LP → ${nextTier}`}
        </span>
        <Button size="icon" variant="ghost" className="h-7 w-7" title="Save category LP" aria-label={`${kit} save category LP`}
          disabled={busy || !valid || (total ?? 0) > 400} onClick={submit}><Check /></Button>
      </div>
    </div>
  );
}
