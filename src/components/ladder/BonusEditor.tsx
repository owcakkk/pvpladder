import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setBonusPoints } from "@/lib/staff.functions";
import type { LadderId } from "@/lib/ladders";

export function BonusEditor({ playerId, kit, bonus, disabled, refresh, ladder = "pvp" }: {
  playerId: string; kit: string; bonus: number; disabled: boolean; refresh: () => Promise<unknown>; ladder?: LadderId;
}) {
  const [value, setValue] = useState(String(bonus));
  const [busy, setBusy] = useState(false);
  const save = useServerFn(setBonusPoints);
  const run = async (operation: () => Promise<number>) => {
    setBusy(true);
    try {
      const result = await operation();
      setValue(String(result));
      await refresh();
      toast.success("Additional LP saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't save LP"); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      <label className="flex min-w-0 flex-1 items-center gap-1 text-muted-foreground">
        <span>Bonus LP</span>
        <input aria-label={`${kit} additional LP`} type="number" step="1" value={value}
          disabled={disabled || busy} onChange={(e) => setValue(e.target.value)}
          className="min-w-0 w-16 rounded border bg-background px-1 py-1 text-foreground" />
      </label>
      <Button size="icon" variant="ghost" className="h-7 w-7" title="Save additional LP" aria-label={`${kit} save additional LP`}
        disabled={disabled || busy || value.trim() === "" || !Number.isInteger(Number(value))}
        onClick={() => run(() => save({ data: { playerId, kit, points: Number(value), ladder } }))}><Check /></Button>
    </div>
  );
}