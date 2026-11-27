import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import ladderImg from "@/assets/overall-ladder-big.png.asset.json";
import { tournamentsQuery } from "@/lib/tournaments";
import { useLadderConfig } from "@/lib/ladder-context";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

// Pill switch between the two ladders: Tiers (PvP Ladder) and Subtiers.
function LadderSwitch() {
  const ladder = useLadderConfig();
  const base = "rounded-full px-4 py-1.5 font-display text-sm font-bold transition-colors";
  const on = `${base} bg-primary text-primary-foreground`;
  const off = `${base} text-muted-foreground hover:text-foreground`;
  return (
    <div className="flex items-center rounded-full border bg-background/60 p-1" role="tablist" aria-label="Ladder">
      <Link to="/" role="tab" aria-selected={ladder.id === "pvp"} className={ladder.id === "pvp" ? on : off}>Tiers</Link>
      <Link to="/sub" role="tab" aria-selected={ladder.id === "sub"} className={ladder.id === "sub" ? on : off}>Subtiers</Link>
    </div>
  );
}

export function Header() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const ladder = useLadderConfig();
  const sub = ladder.id === "sub";
  const { data: tournaments = [] } = useQuery({ ...tournamentsQuery, enabled: ladder.features.tournaments });
  const logo = (
    <>
      <img src={ladderImg.url} alt="" className="h-10 w-10 shrink-0 object-contain" />
      <span className="font-display text-lg font-bold text-foreground">{ladder.name}</span>
    </>
  );
  const link = "text-muted-foreground hover:text-foreground";
  return (
    <header className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center justify-between gap-4 rounded-xl border bg-panel px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-4">
        {sub
          ? <Link to="/sub" className="flex items-center gap-3 text-primary">{logo}</Link>
          : <Link to="/" className="flex items-center gap-3 text-primary">{logo}</Link>}
        <LadderSwitch />
      </div>
      <nav className="order-3 flex w-full items-center justify-center gap-6 text-sm md:order-none md:w-auto">
        {sub
          ? <Link to="/sub" className={link} activeProps={{ className: "text-foreground" }}>Rankings</Link>
          : <Link to="/" className={link} activeProps={{ className: "text-foreground" }}>Rankings</Link>}
        {ladder.features.compare && <Link to="/compare" className={link} activeProps={{ className: "text-foreground" }}>Compare</Link>}
        {ladder.features.stats && <Link to="/stats" className={link} activeProps={{ className: "text-foreground" }}>Stats</Link>}
        {ladder.features.tournaments && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-auto p-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
              Tournaments <ChevronDown className="h-3.5 w-3.5" />
            </Button></DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64 bg-panel">
              <DropdownMenuItem asChild><Link to="/tournaments">All tournaments</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              {tournaments.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No tournaments yet</p>
              )}
              {tournaments.map((t) => (
                <DropdownMenuItem key={t.id} asChild><Link
                  key={t.id}
                  to="/tournaments/$tournamentId"
                  params={{ tournamentId: t.id }}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-row hover:text-foreground"
                >
                  <Trophy className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{t.title}</span>
                </Link></DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {ladder.features.staff && (
          <Link to="/admin" className={link} activeProps={{ className: "text-foreground" }}>Staff</Link>
        )}
      </nav>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (sub) navigate({ to: "/sub", search: { q: q || undefined } });
          else navigate({ to: "/", search: { q: q || undefined } });
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search player..."
          className="w-36 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-44 md:w-52"
        />
      </form>
    </header>
  );
}
