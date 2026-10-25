import { describe, expect, it, vi } from "vitest";
import { ratio, sortByRatio, tournamentQuery, tournamentsQuery, type TournamentPlayer } from "@/lib/tournaments";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn() } }));

const p = (username: string, wins: number, losses: number): TournamentPlayer =>
  ({ id: username, username, mc_uuid: null, wins, losses });

describe("tournament standings", () => {
  it("keeps each tournament roster and cache independent", async () => {
    const from = vi.spyOn(supabase, "from");
    const requestedIds: string[] = [];
    from.mockImplementation((table: string) => ({ select: () => ({ eq: (_column: string, id: string) => {
      requestedIds.push(id);
      return table === "tournaments"
        ? { maybeSingle: async () => ({ data: { id, title: id }, error: null }) }
        : Promise.resolve({ data: [p(`player-${id}`, 2, 1)], error: null });
    } }) }) as ReturnType<typeof supabase.from>);
    try {
      const a = tournamentQuery("sword");
      const b = tournamentQuery("axe");
      expect(a.queryKey).toEqual(["tournament", "sword"]);
      expect(b.queryKey).toEqual(["tournament", "axe"]);
      const first = await (a.queryFn as () => Promise<unknown>)();
      const second = await (b.queryFn as () => Promise<unknown>)();
      expect(first).toMatchObject({ id: "sword", players: [{ username: "player-sword" }] });
      expect(second).toMatchObject({ id: "axe", players: [{ username: "player-axe" }] });
      expect(requestedIds).toEqual(["sword", "sword", "axe", "axe"]);
    } finally { from.mockRestore(); }
  });

  it("lists multiple tournaments without selecting only one", async () => {
    const rows = [{ id: "sword", title: "Sword Cup" }, { id: "axe", title: "Axe Cup" }];
    const from = vi.spyOn(supabase, "from");
    from.mockReturnValue({ select: () => ({ order: async () => ({ data: rows, error: null }) }) } as ReturnType<typeof supabase.from>);
    try { expect(await (tournamentsQuery.queryFn as () => Promise<unknown>)()).toEqual(rows); }
    finally { from.mockRestore(); }
  });

  it("ratio is wins minus losses", () => {
    expect(ratio(p("a", 7, 3))).toBe(4);
    expect(ratio(p("b", 2, 5))).toBe(-3);
  });

  it("sorts by ratio so the top 3 earn HT3", () => {
    const standings = sortByRatio([
      p("low", 1, 8), p("mid", 5, 5), p("first", 9, 1), p("third", 6, 4), p("second", 8, 3),
    ]);
    expect(standings.map((s) => s.username)).toEqual(["first", "second", "third", "mid", "low"]);
    expect(standings.slice(0, 3).map((s) => s.username)).toEqual(["first", "second", "third"]);
  });

  it("breaks ratio ties by wins", () => {
    const standings = sortByRatio([p("fewer", 4, 2), p("more", 6, 4)]);
    expect(standings[0]?.username).toBe("more");
  });
});
