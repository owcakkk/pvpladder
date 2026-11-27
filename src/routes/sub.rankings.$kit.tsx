import { createFileRoute, notFound } from "@tanstack/react-router";
import { Rankings } from "@/components/ladder/Rankings";
import { SUB_KITS, SUB_LADDER } from "@/lib/ladders";

export const Route = createFileRoute("/sub/rankings/$kit")({
  beforeLoad: ({ params }) => {
    if (!SUB_KITS.some((k) => k.id === params.kit)) throw notFound();
  },
  head: ({ params }) => {
    const name = SUB_KITS.find((k) => k.id === params.kit)?.name ?? "Kit";
    return {
      meta: [
        { title: `${name} Rankings — Subtiers Ladder` },
        { name: "description", content: `Minecraft ${name} subtier rankings on Subtiers Ladder.` },
        { property: "og:title", content: `${name} Rankings — Subtiers Ladder` },
        { property: "og:description", content: `Top ${name} players ranked by tier.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: () => <Rankings ladder={SUB_LADDER} kit={Route.useParams().kit} />,
});
