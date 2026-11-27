import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { KITS } from "@/lib/kits";
import { PVP_LADDER, SUB_KITS, SUB_LADDER } from "@/lib/ladders";
import { routeTree } from "@/routeTree.gen";

describe("ladder configuration", () => {
  it("keeps the PvP ladder on its original kits and pages", () => {
    expect(PVP_LADDER.kits).toBe(KITS);
    expect(PVP_LADDER.basePath).toBe("");
    expect(Object.values(PVP_LADDER.features).every(Boolean)).toBe(true);
  });
  it("lists the Subtiers kits in the requested order", () => {
    expect(SUB_KITS.map((k) => k.name)).toEqual([
      "Speed", "Diamond SMP", "Bow", "OGV", "Creeper", "Diamond Vanilla", "Trident", "Manhunt", "Debuff", "Bed", "Elytra",
    ]);
    expect(new Set(SUB_KITS.map((k) => k.id)).size).toBe(SUB_KITS.length);
  });
  it("gives every Subtiers kit a placeholder icon until artwork is added", () => {
    expect(SUB_KITS.every((k) => k.icon || k.image)).toBe(true);
  });
  it("serves the Subtiers ladder under /sub", () => {
    expect(SUB_LADDER.basePath).toBe("/sub");
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/sub").at(-1)?.routeId).toBe("/sub/");
    expect(router.matchRoutes("/sub/rankings/speed").at(-1)?.params).toMatchObject({ kit: "speed" });
  });
});
