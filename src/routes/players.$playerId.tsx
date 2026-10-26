import { createFileRoute, notFound } from "@tanstack/react-router";
import { PlayerProfilePage } from "@/components/ladder/PlayerProfile";
import { ladderQuery } from "@/lib/ladder";

export const Route = createFileRoute("/players/$playerId")({
  loader: async ({ params, context }) => {
    const players = await context.queryClient.ensureQueryData(ladderQuery);
    const player = players.find((p) => p.id === params.playerId);
    if (!player) throw notFound();
    return player;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.username} — PvP Ladder Profile` : "Player Profile — PvP Ladder" },
      { name: "description", content: "Kit tiers and Ladder Points for this Minecraft PvP player." },
      { property: "og:title", content: loaderData ? `${loaderData.username} — PvP Ladder Profile` : "Player Profile — PvP Ladder" },
      { property: "og:description", content: "Kit tiers and Ladder Points on PvP Ladder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PlayerProfilePage playerId={Route.useParams().playerId} />,
  errorComponent: () => (
    <div role="alert" className="py-16 text-center text-destructive">Couldn't load this player's profile.</div>
  ),
  notFoundComponent: () => (
    <div className="py-16 text-center text-muted-foreground">Player not found.</div>
  ),
});
