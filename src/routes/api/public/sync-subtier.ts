import { createFileRoute } from "@tanstack/react-router";

// The Subtiers Discord bot posts its signed results here (the PvP bot uses /api/public/sync-tier).
// Uses SUBTIER_SYNC_SECRET, or the PvP SITE_SYNC_SECRET if no separate secret is set.
export const Route = createFileRoute("/api/public/sync-subtier")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleTierSync } = await import("@/lib/tier-sync.server");
        return handleTierSync(request, process.env["SUBTIER_SYNC_SECRET"] || process.env["SITE_SYNC_SECRET"], "sub");
      },
    },
  },
});
