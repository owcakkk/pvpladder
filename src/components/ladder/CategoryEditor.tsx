import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { tierForLP } from "@/lib/kits";
import { setCategoryPoints } from "@/lib/staff.functions";

// Returns the categories as numbers, or null when they can't be edited safely.
export function numericCategories(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0 || !entries.every(([, v]) => typeof v === "number" && Number.isFinite(v))) return null;
  return Object.fromEntries(entries) as Record<string, number>;
}

export function CategoryEditor({ playerId, kit, categories, refresh }: {
  playerId: string; kit: string; categories: Record<string, number>; refresh: () => Promise<unknown>;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(categories).map(([name, v]) => [name, String(v)])),
  );
  const [busy, setBusy] = useState(false);
  const save = useServerFn(setCategoryPoints);
  const parsed = Object.entries(values).map(([name, v]) => [name, v.trim() === "" ? NaN : Number(v)] as const);
  const valid = parsed.every(([, n]) => Number.isInteger(n) && n >= 0);
  const total = valid ? parsed.reduce((sum, [, n]) => sum + n, 0) : null;
  const nextTier = total != null && total <= 400 ? tierForLP(total) : null;
  const step = (name: string, delta: number) =>
    setValues((current) => ({ ...current, [name]: String(Math.max(0, (Number(current[name]) || 0) + delta)) }));
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
      {Object.keys(values).map((name) => (
        <div key={name} className="flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{name}</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`${name} minus 5`} disabled={busy} onClick={() => step(name, -5)}><Minus /></Button>
          <input aria-label={`${kit} ${name} LP`} type="number" min={0} step={1} value={values[name]} disabled={busy}
            onChange={(e) => setValues((current) => ({ ...current, [name]: e.target.value }))}
            className="w-14 min-w-0 rounded border bg-background px-1 py-0.5 text-foreground" />
          <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`${name} plus 5`} disabled={busy} onClick={() => step(name, 5)}><Plus /></Button>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className={total != null && total > 400 ? "text-destructive" : "text-muted-foreground"}>
          {total == null ? "Enter whole numbers" : total > 400 ? `Total ${total} LP — max 400` : `Total ${total} LP → ${nextTier}`}
        </span>
        <Button size="icon" variant="ghost" className="h-7 w-7" title="Save category LP" aria-label={`${kit} save category LP`}
          disabled={busy || !valid || (total ?? 0) > 400} onClick={submit}><Check /></Button>
      </div>
    </div>
  );
}
