import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches the tournament overview and individual tournaments", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/tournaments").at(-1)?.routeId).toBe("/tournaments/");
    expect(router.matchRoutes("/tournaments/sword-cup").at(-1)?.params).toMatchObject({ tournamentId: "sword-cup" });
  });
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
  it("matches a player profile page for /players/:id", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/players/some-uuid").at(-1)?.routeId).toBe("/players/$playerId");
  });
  it("matches the comparison page for /compare", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/compare").at(-1)?.routeId).toBe("/compare");
  });
});
