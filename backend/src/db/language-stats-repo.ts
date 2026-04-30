import { MatchStatus } from "@prisma/client";
import { prisma } from "./client";

export async function getLanguageWinLoss(
  userId: string
): Promise<{ language: string; wins: number; losses: number; total: number; winRate: number }[]> {
  // Get all completed match participations where this user had a language set
  const participations = await prisma.matchParticipant.findMany({
    where: {
      userId,
      language: { not: null },
      match: {
        status: MatchStatus.COMPLETED,
      },
    },
    select: {
      matchId: true,
      language: true,
      passedCount: true,
      reachedPassedAt: true,
    },
  });

  if (participations.length === 0) {
    return [];
  }

  // For each participation, find the opponent's result to determine win/loss
  const matchIds = participations.map((p) => p.matchId);

  const allParticipants = await prisma.matchParticipant.findMany({
    where: {
      matchId: { in: matchIds },
    },
    select: {
      matchId: true,
      userId: true,
      passedCount: true,
      reachedPassedAt: true,
    },
  });

  // Build a map of matchId -> opponent stats
  const opponentMap: Record<string, { passedCount: number; reachedPassedAt: Date | null }> = {};
  for (const p of allParticipants) {
    if (p.userId !== userId) {
      opponentMap[p.matchId] = {
        passedCount: p.passedCount,
        reachedPassedAt: p.reachedPassedAt,
      };
    }
  }

  // Aggregate wins/losses per language
  const stats: Record<string, { wins: number; losses: number }> = {};

  for (const p of participations) {
    const lang = p.language!;
    if (!stats[lang]) {
      stats[lang] = { wins: 0, losses: 0 };
    }

    const opponent = opponentMap[p.matchId];
    if (!opponent) {
      continue;
    }

    if (p.passedCount > opponent.passedCount) {
      stats[lang].wins++;
    } else if (p.passedCount < opponent.passedCount) {
      stats[lang].losses++;
    } else {
      // Tie-breaking by reachedPassedAt
      if (p.reachedPassedAt && opponent.reachedPassedAt) {
        if (p.reachedPassedAt < opponent.reachedPassedAt) {
          stats[lang].wins++;
        } else {
          stats[lang].losses++;
        }
      }
      // If both null or one null, count as a tie (no win or loss)
    }
  }

  return Object.entries(stats).map(([language, s]) => {
    const total = s.wins + s.losses;
    return {
      language,
      wins: s.wins,
      losses: s.losses,
      total,
      winRate: total > 0 ? Math.round((s.wins / total) * 1000) / 1000 : 0,
    };
  });
}

export async function getLanguageTestCasesPassed(
  userId: string
): Promise<{ language: string; totalPassed: number }[]> {
  const participants = await prisma.matchParticipant.findMany({
    where: {
      userId,
      language: { not: null },
    },
    select: {
      language: true,
      passedCount: true,
    },
  });

  const byLanguage: Record<string, number> = {};

  for (const p of participants) {
    const lang = p.language!;
    byLanguage[lang] = (byLanguage[lang] ?? 0) + p.passedCount;
  }

  return Object.entries(byLanguage).map(([language, totalPassed]) => ({
    language,
    totalPassed,
  }));
}

export async function getTopLanguages(
  userId: string,
  limit = 5
): Promise<{ language: string; matchCount: number; wins: number; totalPassed: number }[]> {
  // Get win/loss and test cases data, then merge
  const [winLoss, testCases] = await Promise.all([
    getLanguageWinLoss(userId),
    getLanguageTestCasesPassed(userId),
  ]);

  const testCasesMap: Record<string, number> = {};
  for (const tc of testCases) {
    testCasesMap[tc.language] = tc.totalPassed;
  }

  const combined = winLoss.map((wl) => ({
    language: wl.language,
    matchCount: wl.total,
    wins: wl.wins,
    totalPassed: testCasesMap[wl.language] ?? 0,
  }));

  // Include languages that appear in testCases but not in winLoss (e.g., no completed matches)
  for (const tc of testCases) {
    if (!combined.some((c) => c.language === tc.language)) {
      combined.push({
        language: tc.language,
        matchCount: 0,
        wins: 0,
        totalPassed: tc.totalPassed,
      });
    }
  }

  // Sort by match count descending, then by wins
  combined.sort((a, b) => b.matchCount - a.matchCount || b.wins - a.wins);

  return combined.slice(0, limit);
}
