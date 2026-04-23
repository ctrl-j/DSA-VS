import { describe, expect, it } from "@jest/globals";

// Pure computation helpers (client-side logic)
interface MatchEntry {
  result: "win" | "loss" | "draw";
  startElo: number;
  endElo: number;
}

function computeStats(entries: MatchEntry[]) {
  const total = entries.length;
  const wins = entries.filter((e) => e.result === "win").length;
  const losses = entries.filter((e) => e.result === "loss").length;
  const draws = entries.filter((e) => e.result === "draw").length;
  const winRate = total > 0 ? wins / total : 0;

  return { total, wins, losses, draws, winRate };
}

describe("Story 12 – Statistics", () => {
  it("computes correct stats from match entries", () => {
    const entries: MatchEntry[] = [
      { result: "win", startElo: 1200, endElo: 1220 },
      { result: "loss", startElo: 1220, endElo: 1200 },
      { result: "win", startElo: 1200, endElo: 1215 },
      { result: "draw", startElo: 1215, endElo: 1215 },
    ];

    const stats = computeStats(entries);

    expect(stats.total).toBe(4);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.draws).toBe(1);
    expect(stats.winRate).toBe(0.5);
  });

  it("handles empty match history", () => {
    const stats = computeStats([]);

    expect(stats.total).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.draws).toBe(0);
    expect(stats.winRate).toBe(0);
  });

  it("computes 100% win rate when all matches are wins", () => {
    const entries: MatchEntry[] = [
      { result: "win", startElo: 1000, endElo: 1020 },
      { result: "win", startElo: 1020, endElo: 1040 },
      { result: "win", startElo: 1040, endElo: 1060 },
    ];

    const stats = computeStats(entries);

    expect(stats.winRate).toBe(1);
    expect(stats.wins).toBe(3);
    expect(stats.losses).toBe(0);
  });
});
