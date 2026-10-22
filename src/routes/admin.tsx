import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, Trash2 } from "lucide-react";
import { Header } from "@/components/ladder/Header";
import { KitIcon } from "@/components/ladder/KitIcon";
import { Avatar } from "@/components/ladder/Rankings";
import { ladderQuery } from "@/lib/ladder";
import {
  addPlayer, lockStaff, removePlayer, setTier, staffStatus, unlockStaff, updateRegion,
} from "@/lib/staff.functions";
import { KITS, REGIONS, TIERS, tierBadgeClass } from "@/lib/kits";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Staff Panel — PvP Ladder" },
      { name: "description", content: "Staff panel for assigning PvP Ladder tiers." },
      { property: "og:title", content: "Staff Panel — PvP Ladder" },
      { property: "og:description", content: "Staff panel for assigning tiers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btnCls = "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

function PasswordForm({ onUnlocked }: { onUnlocked: () => void }) {
  const unlock = useServerFn(unlockStaff);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setWrong(false);
    try {
      const r = await unlock({ data: { password } });
      if (r.ok) onUnlocked(); else setWrong(true);
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };
  return (
    <div className="mx-auto mt-10 max-w-sm rounded-xl border bg-panel p-6">
      <div className="mb-4 flex items-center gap-2">
        <Lock className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-bold">Staff access</h1>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input className={inputCls} type="password" placeholder="Staff password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {wrong && <p className="text-sm text-destructive">Incorrect password</p>}
        <button className={`${btnCls} w-full`} disabled={busy}>{busy ? "Checking…" : "Enter"}</button>
      </form>
    </div>
  );
}

function AdminPanel() {
  const qc = useQueryClient();
  const { data: players = [] } = useQuery(ladderQuery);
  const add = useServerFn(addPlayer);
  const saveTier = useServerFn(setTier);
  const saveRegion = useServerFn(updateRegion);
  const del = useServerFn(removePlayer);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("EU");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["ladder"] });

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); await refresh(); } catch (err) { toast.error(errMsg(err)); }
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    await run(async () => {
      const r = await add({ data: { username: name, region } });
      toast.success(`Added ${r.username}`); setName("");
    });
    setBusy(false);
  };

  const list = [...players].sort((a, b) => a.username.localeCompare(b.username))
    .filter((p) => p.username.toLowerCase().includes(filter.toLowerCase()));

  return (
    <main className="mx-auto mt-6 max-w-6xl space-y-6">
      <section className="rounded-xl border bg-panel p-5">
        <h2 className="mb-3 font-display text-xl font-bold">Add player</h2>
        <form onSubmit={onAdd} className="flex flex-wrap gap-3">
          <input className={`${inputCls} max-w-xs`} placeholder="Minecraft username" value={name} onChange={(e) => setName(e.target.value)} required />
          <select className={`${inputCls} w-24`} value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className={btnCls} disabled={busy}>{busy ? "Looking up…" : "Look up & add"}</button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Player info is fetched from crafty.gg.</p>
      </section>

      <section className="rounded-xl border bg-panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Assign tiers</h2>
          <input className={`${inputCls} max-w-xs`} placeholder="Filter players…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="space-y-3">
          {list.map((p) => (
            <div key={p.id} className="rounded-lg border bg-row p-4">
              <div className="mb-3 flex items-center gap-3">
                <Avatar p={p} className="h-10" />
                <span className="font-display text-lg font-bold">{p.username}</span>
                <span className="text-sm text-muted-foreground">{p.points} pts</span>
                <select className="ml-auto rounded-md border bg-background px-2 py-1 text-sm" value={p.region}
                  onChange={(e) => run(() => saveRegion({ data: { playerId: p.id, region: e.target.value } }))}>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <button aria-label={`Remove ${p.username}`} className="text-muted-foreground hover:text-destructive"
                  onClick={() => { if (confirm(`Remove ${p.username} from the ladder?`)) run(() => del({ data: { playerId: p.id } })); }}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {KITS.map((k) => (
                  <label key={k.id} className="flex items-center gap-2 rounded-md bg-background p-2 text-xs">
                    <KitIcon kit={k} className={`h-4 w-4 shrink-0 ${k.tone}`} />
                    <span className="flex-1 truncate">{k.name}</span>
                    <select
                      value={p.tiers[k.id] ?? ""}
                      onChange={(e) => run(() => saveTier({ data: { playerId: p.id, kit: k.id, tier: e.target.value } }))}
                      className={`rounded px-1 py-0.5 font-display font-bold ${tierBadgeClass(p.tiers[k.id])}`}
                    >
                      <option value="">—</option>
                      {TIERS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function AdminPage() {
  const qc = useQueryClient();
  const status = useServerFn(staffStatus);
  const lock = useServerFn(lockStaff);
  const { data, isLoading } = useQuery({ queryKey: ["staff"], queryFn: () => status() });
  const recheck = () => qc.invalidateQueries({ queryKey: ["staff"] });
  return (
    <div className="min-h-screen px-4 pb-16">
      <Header />
      {isLoading ? (
        <p className="mt-10 text-center text-muted-foreground">Loading…</p>
      ) : !data?.staff ? (
        <PasswordForm onUnlocked={recheck} />
      ) : (
        <>
          <div className="mx-auto mt-4 flex max-w-6xl justify-end">
            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={async () => { await lock(); recheck(); }}>
              <Lock className="h-4 w-4" /> Lock staff panel
            </button>
          </div>
          <AdminPanel />
        </>
      )}
    </div>
  );
}
