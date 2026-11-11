import { createFileRoute, notFound } from "@tanstack/react-router";
import { Rankings } from "@/components/ladder/Rankings";
import { KITS } from "@/lib/kits";

export const Route = createFileRoute("/rankings/$kit")({
  beforeLoad: ({ params }) => {
    if (!KITS.some((k) => k.id === params.kit)) throw notFound();
  },
  head: ({ params }) => {
    const name = KITS.find((k) => k.id === params.kit)?.name ?? "Kit";
    return {
      meta: [
        { title: `${name} Rankings — PvP Ladder` },
        { name: "description", content: `Minecraft ${name} PvP tier rankings on PvP Ladder.` },
        { property: "og:title", content: `${name} Rankings — PvP Ladder` },
        { property: "og:description", content: `Top ${name} players ranked by tier.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: () => <Rankings kit={Route.useParams().kit} />,
});
