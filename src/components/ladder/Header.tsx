import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import ladderImg from "@/assets/overall-ladder-big.png.asset.json";
import { tournamentsQuery } from "@/lib/tournaments";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export function Header() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data: tournaments = [] } = useQuery(tournamentsQuery);
  return (
    <header className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center justify-between gap-4 rounded-xl border bg-panel px-4 py-4 sm:px-6">
      <Link to="/" className="flex items-center gap-3 text-primary">
        <img src={ladderImg.url} alt="" className="h-10 w-10 shrink-0 object-contain" />
        <span className="font-display text-lg font-bold text-foreground">PvP Ladder</span>
      </Link>
      <nav className="order-3 flex w-full items-center justify-center gap-6 text-sm md:order-none md:w-auto">
        <Link to="/" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>Rankings</Link>
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
        <Link to="/admin" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>
          Staff
        </Link>
      </nav>
      <form
        onSubmit={(e) => { e.preventDefault(); navigate({ to: "/", search: { q: q || undefined } }); }}
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
