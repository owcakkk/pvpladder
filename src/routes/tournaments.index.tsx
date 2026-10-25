import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Trophy } from "lucide-react";
import { Header } from "@/components/ladder/Header";
import { tournamentsQuery } from "@/lib/tournaments";

export const Route = createFileRoute("/tournaments/")({
  head: () => ({ meta: [
    { title: "All Tournaments — PvP Ladder" },
    { name: "description", content: "Browse PvP Ladder tournaments and their round-robin standings." },
    { property: "og:title", content: "All Tournaments — PvP Ladder" },
    { property: "og:description", content: "Explore every PvP Ladder tournament and player standings." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TournamentList,
});

function TournamentList() {
  const { data: tournaments = [], isLoading, error } = useQuery(tournamentsQuery);
  return <div className="min-h-screen px-4 pb-16">
    <Header />
    <main className="mx-auto mt-8 max-w-4xl">
      <h1 className="mb-6 flex items-center gap-3 font-display text-2xl font-bold"><Trophy className="text-primary" />Tournaments</h1>
      {isLoading ? <p className="py-8 text-muted-foreground">Loading tournaments…</p> : error ? <p className="py-8 text-destructive">Couldn't load tournaments.</p> : tournaments.length === 0 ? <p className="py-8 text-muted-foreground">No tournaments yet.</p> : <div className="grid gap-4 sm:grid-cols-2">
        {tournaments.map((t) => <Link key={t.id} to="/tournaments/$tournamentId" params={{ tournamentId: t.id }} className="flex min-w-0 items-center gap-3 rounded-lg border bg-panel p-5 transition-colors hover:border-primary">
          <Trophy className="h-5 w-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 break-words font-display text-lg font-bold">{t.title}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>)}
      </div>}
    </main>
  </div>;
}