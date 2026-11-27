import { createFileRoute } from "@tanstack/react-router";
import { Rankings } from "@/components/ladder/Rankings";
import { SUB_LADDER } from "@/lib/ladders";

export const Route = createFileRoute("/sub/")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } =>
    typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {},
  head: () => ({
    meta: [
      { title: "Subtiers Ladder — Minecraft Subtiers Rankings" },
      { name: "description", content: "Overall Minecraft Subtiers rankings across Speed, Bow, Trident, Elytra and more." },
      { property: "og:title", content: "Subtiers Ladder — Overall Rankings" },
      { property: "og:description", content: "Overall Minecraft Subtiers rankings across every kit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Rankings ladder={SUB_LADDER} q={Route.useSearch().q} />,
});
