import { describe, expect, it } from "@jest/globals";

// Pure computation helpers for chart data (client-side logic)
interface MatchEntry {
  result: "win" | "loss" | "draw";
  category: string;
  endElo: number;
  matchDate: string;
}

function groupWinsByCategory(entries: MatchEntry[]): Record<string, { wins: number; total: number }> {
  const groups: Record<string, { wins: number; total: number }> = {};
  for (const entry of entries) {
    if (!groups[entry.category]) {
      groups[entry.category] = { wins: 0, total: 0 };
    }
    groups[entry.category].total += 1;
    if (entry.result === "win") {
      groups[entry.category].wins += 1;
    }
  }
  return groups;
}

function trackEloOverTime(entries: MatchEntry[]): { date: string; elo: number }[] {
  return entries.map((entry) => ({
    date: entry.matchDate,
    elo: entry.endElo,
  }));
}

describe("Story 13 – Stats Visualization Data", () => {
  const sampleEntries: MatchEntry[] = [
    { result: "win", category: "Arrays", endElo: 1220, matchDate: "2026-03-01" },
    { result: "loss", category: "Arrays", endElo: 1200, matchDate: "2026-03-05" },
    { result: "win", category: "Trees", endElo: 1215, matchDate: "2026-03-10" },
    { result: "win", category: "Trees", endElo: 1230, matchDate: "2026-03-15" },
    { result: "loss", category: "Graphs", endElo: 1210, matchDate: "2026-03-20" },
  ];

  it("groups wins by category", () => {
    const grouped = groupWinsByCategory(sampleEntries);

    expect(grouped["Arrays"]).toEqual({ wins: 1, total: 2 });
    expect(grouped["Trees"]).toEqual({ wins: 2, total: 2 });
    expect(grouped["Graphs"]).toEqual({ wins: 0, total: 1 });
  });

  it("tracks ELO over time in chronological order", () => {
    const eloTimeline = trackEloOverTime(sampleEntries);

    expect(eloTimeline).toHaveLength(5);
    expect(eloTimeline[0]).toEqual({ date: "2026-03-01", elo: 1220 });
    expect(eloTimeline[4]).toEqual({ date: "2026-03-20", elo: 1210 });
  });

  it("handles empty entries for grouping", () => {
    const grouped = groupWinsByCategory([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it("handles single entry for ELO tracking", () => {
    const single: MatchEntry[] = [
      { result: "win", category: "DP", endElo: 1050, matchDate: "2026-03-25" },
    ];
    const timeline = trackEloOverTime(single);
    expect(timeline).toEqual([{ date: "2026-03-25", elo: 1050 }]);
  });
});
