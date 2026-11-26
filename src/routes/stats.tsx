import { createFileRoute } from "@tanstack/react-router";
import { Stats } from "@/components/ladder/Stats";
import { ladderQuery } from "@/lib/ladder";

export const Route = createFileRoute("/stats")({
  loader: ({ context }) => context.queryClient.ensureQueryData(ladderQuery),
  head: () => ({
    meta: [
      { title: "Statistics — PvP Ladder" },
      { name: "description", content: "How many players hold each tier in every kit, region split and kit leaders." },
      { property: "og:title", content: "Statistics — PvP Ladder" },
      { property: "og:description", content: "Tier distribution for every kit on PvP Ladder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stats,
});
