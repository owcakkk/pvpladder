import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import ladderImg from "@/assets/overall-ladder-big.png.asset.json";
import { tournamentsQuery } from "@/lib/tournaments";

export function Header() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data: tournaments = [] } = useQuery(tournamentsQuery);
  return (
    <header className="mx-auto mt-8 flex max-w-6xl items-center justify-between gap-4 rounded-xl border bg-panel px-6 py-4">
      <Link to="/" className="flex items-center gap-3 text-primary">
        <img src={ladderImg.url} alt="" className="h-10 w-10 shrink-0 object-contain" />
        <span className="font-display text-lg font-bold text-foreground">PvP Ladder</span>
      </Link>
      <nav className="hidden items-center gap-6 text-sm md:flex">
        <Link to="/" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>Rankings</Link>
        <div className="group relative">
          <Link to="/tournaments" className="flex items-center gap-1 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            Tournaments <ChevronDown className="h-3.5 w-3.5" />
          </Link>
          <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
            <div className="rounded-lg border bg-panel p-1.5 shadow-lg">
              {tournaments.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No tournaments yet</p>
              )}
              {tournaments.map((t) => (
                <Link
                  key={t.id}
                  to="/tournaments/$tournamentId"
                  params={{ tournamentId: t.id }}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-row hover:text-foreground"
                >
                  <Trophy className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{t.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
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
          className="w-44 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring md:w-52"
        />
      </form>
    </header>
  );
}
