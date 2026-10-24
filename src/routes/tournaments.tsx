import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { Header } from "@/components/ladder/Header";
import { Avatar } from "@/components/ladder/Rankings";
import { ratio, sortByRatio, tournamentQuery } from "@/lib/tournaments";
import { tierBadgeClass } from "@/lib/kits";

export const Route = createFileRoute("/tournaments")({
  head: () => ({
    meta: [
      { title: "Tournaments — PvP Ladder" },
      { name: "description", content: "PvP Ladder round-robin tournament standings — everyone battles everyone, top 3 earn HT3." },
      { property: "og:title", content: "Tournaments — PvP Ladder" },
      { property: "og:description", content: "Round-robin tournament standings on PvP Ladder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TournamentsPage,
});

const medal = (rank: number) =>
  rank === 0 ? "text-gold" : rank === 1 ? "text-silver" : rank === 2 ? "text-bronze" : "text-muted-foreground";

function TournamentsPage() {
  const { data: tournament, isLoading } = useQuery(tournamentQuery);
  const players = tournament ? sortByRatio(tournament.players) : [];

  return (
    <div className="min-h-screen px-4 pb-16">
      <Header />
      <main className="mx-auto mt-6 max-w-4xl">
        <section className="rounded-xl border bg-panel p-6">
          <div className="mb-1 flex items-center gap-3">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold">{tournament?.title ?? "Tournament"}</h1>
          </div>
          <p className="mb-5 text-sm text-muted-foreground">
            Round-robin: every player battles every other player. Ratio = wins − losses. The top 3 earn an HT3 tier.
          </p>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading…</p>
          ) : players.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No players registered yet — check back soon.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Player</th>
                    <th className="py-2 pr-3 text-center">Wins</th>
                    <th className="py-2 pr-3 text-center">Losses</th>
                    <th className="py-2 pr-3 text-center">Ratio</th>
                    <th className="py-2 text-right">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={p.id} className={`border-b last:border-0 ${i < 3 ? "bg-row" : ""}`}>
                      <td className={`py-2.5 pr-3 font-display font-bold ${medal(i)}`}>{i + 1}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <Avatar p={p} className="h-8" />
                          <span className="font-semibold">{p.username}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-center text-region-eu">{p.wins}</td>
                      <td className="py-2.5 pr-3 text-center text-destructive">{p.losses}</td>
                      <td className="py-2.5 pr-3 text-center font-display font-bold">
                        {ratio(p) > 0 ? `+${ratio(p)}` : ratio(p)}
                      </td>
                      <td className="py-2.5 text-right">
                        {i < 3 && (
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${tierBadgeClass("HT3")}`}>
                            HT3
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
