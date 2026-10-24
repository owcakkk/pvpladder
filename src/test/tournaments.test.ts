import { describe, expect, it } from "vitest";
import { ratio, sortByRatio, type TournamentPlayer } from "@/lib/tournaments";

const p = (username: string, wins: number, losses: number): TournamentPlayer =>
  ({ id: username, username, mc_uuid: null, wins, losses });

describe("tournament standings", () => {
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
    expect(standings[0].username).toBe("more");
  });
});
