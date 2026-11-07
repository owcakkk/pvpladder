import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { z } from "zod";

export const Route = createFileRoute("/api/public/jobs/refresh-minecraft-usernames")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const input = z.object({ kind: z.literal("minecraft-usernames") }).strict()
          .safeParse(await request.json().catch(() => null));
        if (!input.success) return Response.json({ error: "Invalid refresh request" }, { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { refreshMcUsernames } = await import("@/lib/mc-refresh.server");
        try {
          return Response.json({ success: true, ...await refreshMcUsernames(supabaseAdmin) });
        } catch (error) {
          console.error("Scheduled Minecraft username refresh failed", error);
          return Response.json({ error: error instanceof Error ? error.message : "Username refresh failed" }, { status: 500 });
        }
      },
    },
  },
});