import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/ladder/Header";
import { Avatar } from "@/components/ladder/Rankings";
import { ladderQuery } from "@/lib/ladder";
import { lookupPlayer } from "@/lib/crafty.functions";
import { KITS, REGIONS, TIERS, tierBadgeClass } from "@/lib/kits";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — PvP Ladder" },
      { name: "description", content: "Staff panel for assigning PvP Ladder tiers." },
      { property: "og:title", content: "Admin Panel — PvP Ladder" },
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

function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (res.error) { toast.error(res.error.message); return; }
    if (mode === "up" && !res.data.session) toast.success("Check your email to confirm your account.");
  };
  return (
    <div className="mx-auto mt-10 max-w-sm rounded-xl border bg-panel p-6">
      <h1 className="mb-4 font-display text-2xl font-bold">Staff {mode === "in" ? "sign in" : "sign up"}</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputCls} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        <button className={`${btnCls} w-full`} disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</button>
      </form>
      <button
        className="mt-3 w-full rounded-lg border bg-row px-4 py-2 text-sm font-semibold hover:bg-accent"
        onClick={async () => {
          const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/admin" });
          if (r.error) toast.error(String(r.error.message ?? r.error));
        }}
      >Continue with Google</button>
      <button className="mt-4 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}

function AdminPanel() {
  const qc = useQueryClient();
  const { data: players = [] } = useQuery(ladderQuery);
  const lookup = useServerFn(lookupPlayer);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("EU");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["ladder"] });

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const info = await lookup({ data: { username: name } });
      const { error } = await supabase.from("players").insert({ username: info.username, mc_uuid: info.uuid, region });
      if (error) throw error;
      toast.success(`Added ${info.username}`); setName(""); refresh();
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };

  const setTier = async (playerId: string, kit: string, tier: string) => {
    const { error } = tier === ""
      ? await supabase.from("player_tiers").delete().eq("player_id", playerId).eq("kit", kit)
      : await supabase.from("player_tiers").upsert({ player_id: playerId, kit, tier, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  const updateRegion = async (id: string, r: string) => {
    const { error } = await supabase.from("players").update({ region: r }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  const remove = async (id: string, username: string) => {
    if (!confirm(`Remove ${username} from the ladder?`)) return;
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  const list = [...players].sort((a, b) => a.username.localeCompare(b.username))
    .filter((p) => p.username.toLowerCase().includes(filter.toLowerCase()));

  return (
    <main className="mx-auto mt-8 max-w-6xl space-y-6">
      <section className="rounded-xl border bg-panel p-5">
        <h2 className="mb-3 font-display text-xl font-bold">Add player</h2>
        <form onSubmit={addPlayer} className="flex flex-wrap gap-3">
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
                <select className="ml-auto rounded-md border bg-background px-2 py-1 text-sm" value={p.region} onChange={(e) => updateRegion(p.id, e.target.value)}>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <button onClick={() => remove(p.id, p.username)} aria-label={`Remove ${p.username}`} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {KITS.map((k) => (
                  <label key={k.id} className="flex items-center gap-2 rounded-md bg-background p-2 text-xs">
                    <k.icon className={`h-4 w-4 shrink-0 ${k.tone}`} />
                    <span className="flex-1 truncate">{k.name}</span>
                    <select
                      value={p.tiers[k.id] ?? ""}
                      onChange={(e) => setTier(p.id, k.id, e.target.value)}
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
  const { user, isAdmin, loading } = useAuth();
  return (
    <div className="min-h-screen px-4 pb-16">
      <Header />
      {loading ? (
        <p className="mt-10 text-center text-muted-foreground">Loading…</p>
      ) : !user ? (
        <AuthForm />
      ) : !isAdmin ? (
        <div className="mx-auto mt-10 max-w-md rounded-xl border bg-panel p-6 text-center">
          <p>Signed in as {user.email}, but this account isn't an admin.</p>
          <button className="mt-4 text-sm text-muted-foreground underline" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      ) : (
        <>
          <div className="mx-auto mt-4 flex max-w-6xl justify-end text-sm text-muted-foreground">
            {user.email} · <button className="ml-1 underline" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
          <AdminPanel />
        </>
      )}
    </div>
  );
}
