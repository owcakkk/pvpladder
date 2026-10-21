import { createFileRoute } from "@tanstack/react-router";
import { Rankings } from "@/components/ladder/Rankings";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {},
  head: () => ({
    meta: [
      { title: "PvP Ladder — Overall Minecraft PvP Rankings" },
      { name: "description", content: "Overall Minecraft PvP tier rankings across Sword, Axe, Mace, UHC, SMP and more." },
      { property: "og:title", content: "PvP Ladder — Overall Rankings" },
      { property: "og:description", content: "Overall Minecraft PvP tier rankings across every kit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Rankings q={Route.useSearch().q} />,
});
