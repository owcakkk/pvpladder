import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ladder/Rankings";
import { addTournamentPlayer, createTournament, deleteTournament, removeTournamentPlayer, setTournamentRecord, setTournamentTitle, setTournamentKit } from "@/lib/tournaments.functions";
import { ratio, sortByRatio, tournamentQuery, tournamentsQuery, type TournamentPlayer } from "@/lib/tournaments";
import { KITS } from "@/lib/kits";

const inputCls = "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const errorMessage = (e: unknown) => e instanceof Error ? e.message : "Something went wrong";

function RecordEditor({ player, refresh }: { player: TournamentPlayer; refresh: () => Promise<unknown> }) {
  const save = useServerFn(setTournamentRecord);
  const [wins, setWins] = useState(player.wins);
  const [losses, setLosses] = useState(player.losses);
  const [busy, setBusy] = useState(false);
  return <form className="flex items-center gap-2" onSubmit={async (e) => {
    e.preventDefault(); setBusy(true);
    try { await save({ data: { playerId: player.id, wins, losses } }); await refresh(); toast.success(`Saved ${player.username}`); }
    catch (err) { toast.error(errorMessage(err)); }
    finally { setBusy(false); }
  }}>
    <input type="number" min={0} max={9999} required aria-label={`Wins for ${player.username}`} className={`${inputCls} w-16 sm:w-20`} value={wins} onChange={(e) => setWins(Number(e.target.value))} />
    <span className="text-muted-foreground">:</span>
    <input type="number" min={0} max={9999} required aria-label={`Losses for ${player.username}`} className={`${inputCls} w-16 sm:w-20`} value={losses} onChange={(e) => setLosses(Number(e.target.value))} />
    <Button size="sm" disabled={busy || (wins === player.wins && losses === player.losses)}>Save</Button>
  </form>;
}

function TournamentEditor({ id }: { id: string }) {
  const qc = useQueryClient();
  const { data: tournament, isLoading, error } = useQuery({ ...tournamentQuery(id), refetchInterval: 15000 });
  const saveTitle = useServerFn(setTournamentTitle);
  const saveKit = useServerFn(setTournamentKit);
  const addPlayer = useServerFn(addTournamentPlayer);
  const removePlayer = useServerFn(removeTournamentPlayer);
  const [title, setTitle] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["tournament", id] });
  if (isLoading) return <p className="text-muted-foreground">Loading tournament…</p>;
  if (error) return <p className="text-destructive">Couldn't load tournament.</p>;
  if (!tournament) return <p className="text-muted-foreground">Tournament not found.</p>;
  const players = sortByRatio(tournament.players);
  return <div className="space-y-4">
    <form className="flex flex-wrap gap-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try {
        await saveTitle({ data: { tournamentId: id, title: title ?? tournament.title } });
        await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ["tournaments"] })]);
        setTitle(null); toast.success("Title saved");
      } catch (err) { toast.error(errorMessage(err)); }
      finally { setBusy(false); }
    }}>
      <input aria-label="Tournament title" className={`${inputCls} max-w-xs`} value={title ?? tournament.title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required />
      <Button disabled={busy}>Save title</Button>
    </form>
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor={`tournament-kit-${id}`} className="text-sm font-semibold">LT3 registration kit</label>
      <select id={`tournament-kit-${id}`} aria-label="Tournament kit" className={`${inputCls} max-w-xs`} value={tournament.kit ?? ""} disabled={busy} onChange={async (e) => {
        const kit = e.target.value || null;
        if (tournament.kit && kit && kit !== tournament.kit && !confirm("Change kit? Automatically registered players and their tournament records will be replaced.")) return;
        setBusy(true);
        try {
          await saveKit({ data: { tournamentId: id, kit } });
          await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ["tournaments"] })]);
          toast.success("Tournament kit saved");
        } catch (err) { toast.error(errorMessage(err)); }
        finally { setBusy(false); }
      }}>
        <option value="">Manual registration only</option>
        {KITS.map((kit) => <option key={kit.id} value={kit.id}>{kit.name}</option>)}
      </select>
      <span className="text-sm text-muted-foreground">{players.length}/10 players</span>
    </div>
    <form className="flex flex-wrap gap-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try { const result = await addPlayer({ data: { tournamentId: id, username } }); await refresh(); setUsername(""); toast.success(`Registered ${result.username}`); }
      catch (err) { toast.error(errorMessage(err)); }
      finally { setBusy(false); }
    }}>
      <input aria-label="Tournament player username" placeholder="Minecraft username" className={`${inputCls} max-w-xs`} value={username} onChange={(e) => setUsername(e.target.value)} required />
      <Button disabled={busy || players.length >= 10}>{busy ? "Saving…" : `Register player (${players.length}/10)`}</Button>
    </form>
    <div className="space-y-2">
      {players.map((player, i) => <div key={`${player.id}-${player.wins}-${player.losses}`} className="flex flex-wrap items-center gap-3 rounded-lg border bg-row p-3">
        <span className="w-6 font-display font-bold text-muted-foreground">{i + 1}</span>
        <Avatar p={player} className="h-8" />
        <span className="break-all font-semibold">{player.username}</span>
        {player.ladder_player_id && <span className="text-xs text-primary">LT3 entry</span>}
        <span className="text-sm text-muted-foreground">ratio {ratio(player) > 0 ? `+${ratio(player)}` : ratio(player)}</span>
        <div className="flex max-w-full flex-wrap items-center gap-2 sm:ml-auto">
          <RecordEditor player={player} refresh={refresh} />
          <Button variant="ghost" size="icon" aria-label={`Remove ${player.username} from tournament`} title="Remove player" disabled={busy} onClick={async () => {
            if (!confirm(`Remove ${player.username} from ${tournament.title}?`)) return;
            setBusy(true);
            try { await removePlayer({ data: { playerId: player.id } }); await refresh(); }
            catch (err) { toast.error(errorMessage(err)); }
            finally { setBusy(false); }
          }}><Trash2 /></Button>
        </div>
      </div>)}
      {players.length === 0 && <p className="text-sm text-muted-foreground">No players registered yet.</p>}
    </div>
  </div>;
}

export function TournamentManager() {
  const qc = useQueryClient();
  const { data: tournaments = [], isLoading, error } = useQuery(tournamentsQuery);
  const create = useServerFn(createTournament);
  const remove = useServerFn(deleteTournament);
  const [selected, setSelected] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const active = tournaments.find((t) => t.id === selected) ?? tournaments[0];
  return <section className="space-y-5 border-t pt-6">
    <h2 className="font-display text-xl font-bold">Tournaments</h2>
    <form className="flex flex-wrap gap-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try { const result = await create({ data: { title: newTitle } }); await qc.invalidateQueries({ queryKey: ["tournaments"] }); setSelected(result.id); setNewTitle(""); toast.success("Tournament created"); }
      catch (err) { toast.error(errorMessage(err)); }
      finally { setBusy(false); }
    }}>
      <input aria-label="New tournament title" placeholder="New tournament title" className={`${inputCls} max-w-xs`} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={80} required />
      <Button disabled={busy}><Plus />Create tournament</Button>
    </form>
    {isLoading ? <p className="text-muted-foreground">Loading tournaments…</p> : error ? <p className="text-destructive">Couldn't load tournaments.</p> : active ? <>
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Selected tournament" className={`${inputCls} max-w-xs`} value={active.id} onChange={(e) => setSelected(e.target.value)} disabled={busy}>
          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <Button variant="ghost" size="icon" aria-label="Delete selected tournament" title="Delete tournament" disabled={busy} onClick={async () => {
          if (!confirm(`Delete ${active.title} and all its registered players?`)) return;
          setBusy(true);
          try { await remove({ data: { tournamentId: active.id } }); await qc.invalidateQueries({ queryKey: ["tournaments"] }); qc.removeQueries({ queryKey: ["tournament", active.id] }); setSelected(null); toast.success("Tournament deleted"); }
          catch (err) { toast.error(errorMessage(err)); }
          finally { setBusy(false); }
        }}><Trash2 className="text-destructive" /></Button>
      </div>
      <TournamentEditor key={active.id} id={active.id} />
    </> : <p className="text-sm text-muted-foreground">No tournaments yet.</p>}
  </section>;
}