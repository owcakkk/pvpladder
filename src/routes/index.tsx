import { createFileRoute } from "@tanstack/react-router";
import { Rankings } from "@/components/ladder/Rankings";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } =>
    typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {},
  head: () => ({
    meta: [
      { title: "PvP Ladder — Overall Minecraft PvP Rankings" },
      { name: "description", content: "Overall Minecraft PvP tier rankings across Sword, Axe, Mace, UHC, SMP and more." },
      { property: "og:title", content: "PvP Ladder — Overall Rankings" },
      { property: "og:description", content: "Overall Minecraft PvP tier rankings across every kit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://pvpladder.lovable.app/__l5e/assets-v1/1dac842e-1baf-4ab1-8829-6e514c7ab087/pvpladder-share.jpg" },
      { name: "twitter:image", content: "https://pvpladder.lovable.app/__l5e/assets-v1/1dac842e-1baf-4ab1-8829-6e514c7ab087/pvpladder-share.jpg" },
    ],
  }),
  component: () => <Rankings q={Route.useSearch().q} />,
});
