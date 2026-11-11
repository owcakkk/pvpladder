import { createFileRoute, notFound } from "@tanstack/react-router";
import { Rankings } from "@/components/ladder/Rankings";
import { kitFor } from "@/lib/kits";

export const Route = createFileRoute("/rankings/$kit")({
  beforeLoad: ({ params }) => {
    if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(params.kit)) throw notFound();
  },
  head: ({ params }) => {
    const name = kitFor(params.kit).name;
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
