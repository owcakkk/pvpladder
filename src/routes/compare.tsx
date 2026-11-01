import { createFileRoute } from "@tanstack/react-router";
import { ComparePage } from "@/components/ladder/Compare";
import { ladderQuery } from "@/lib/ladder";

export const Route = createFileRoute("/compare")({
  validateSearch: (search: Record<string, unknown>) => ({
    a: typeof search.a === "string" ? search.a : undefined,
    b: typeof search.b === "string" ? search.b : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(ladderQuery),
  head: () => ({
    meta: [
      { title: "Compare Players — PvP Ladder" },
      { name: "description", content: "Compare two Minecraft PvP players' tiers and Ladder Points across every kit." },
      { property: "og:title", content: "Compare Players — PvP Ladder" },
      { property: "og:description", content: "Side-by-side tier and Ladder Point comparison for every kit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ComparePage a={Route.useSearch().a} b={Route.useSearch().b} />,
});
