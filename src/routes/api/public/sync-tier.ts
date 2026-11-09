import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/sync-tier")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleTierSync } = await import("@/lib/tier-sync.server");
        return handleTierSync(request, process.env["SITE_SYNC_SECRET"]);
      },
    },
  },
});