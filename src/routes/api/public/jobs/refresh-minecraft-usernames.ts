import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { z } from "zod";

// Lovable's scheduler sends LOVABLE_CRON_SECRET. An external scheduler (GitHub Actions)
// can instead send the same SITE_SYNC_SECRET the Discord bot already uses.
async function authorize(request: Request): Promise<Response | null> {
  const failure = await authenticateCronRequest(request);
  if (!failure) return null;
  const secret = process.env["SITE_SYNC_SECRET"];
  const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (secret && token) {
    const { createHash, timingSafeEqual } = await import("node:crypto");
    const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
    if (timingSafeEqual(digest(token), digest(secret))) return null;
  }
  return failure;
}

export const Route = createFileRoute("/api/public/jobs/refresh-minecraft-usernames")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authorize(request);
        if (authFailure) return authFailure;
        const input = z.object({ kind: z.literal("minecraft-usernames") }).strict()
          .safeParse(await request.json().catch(() => null));
        if (!input.success) return Response.json({ error: "Invalid refresh request" }, { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { refreshMcUsernames } = await import("@/lib/mc-refresh.server");
        try {
          const summary = await refreshMcUsernames(supabaseAdmin);
          // Daily rank snapshot for the rank-change arrows; never affects the refresh result.
          let snapshot: "created" | "skipped" | "error" = "skipped";
          try {
            const { takeRankSnapshot } = await import("@/lib/rank-snapshot.server");
            snapshot = await takeRankSnapshot(supabaseAdmin);
          } catch (snapshotError) {
            snapshot = "error";
            console.warn("Rank snapshot failed", snapshotError);
          }
          return Response.json({ success: true, ...summary, snapshot });
        } catch (error) {
          console.error("Scheduled Minecraft username refresh failed", error);
          return Response.json({ error: error instanceof Error ? error.message : "Username refresh failed" }, { status: 500 });
        }
      },
    },
  },
});