import { Difficulty, MatchStatus } from "@prisma/client";
import { prisma } from "./client";

interface SolveTimeBucket {
  bucket: string;
  count: number;
}

interface CategorySuccessRate {
  category: string;
  totalAttempts: number;
  successCount: number;
  successRate: number;
}

export async function getHardProblemSolveTimeDistribution(): Promise<
  SolveTimeBucket[]
> {
  // Find all completed matches with HARD problems
  const participants = await prisma.matchParticipant.findMany({
    where: {
      match: {
        status: MatchStatus.COMPLETED,
        problem: {
          difficulty: Difficulty.HARD,
        },
        startedAt: { not: null },
      },
      reachedPassedAt: { not: null },
    },
    select: {
      reachedPassedAt: true,
      match: {
        select: {
          startedAt: true,
          problem: {
            select: {
              testCases: {
                select: { id: true },
              },
            },
          },
        },
      },
      passedCount: true,
    },
  });

  // Filter to only participants who passed ALL tests
  const solvers = participants.filter((p) => {
    const totalTests = p.match.problem?.testCases.length ?? 0;
    return totalTests > 0 && p.passedCount >= totalTests;
  });

  // Calculate solve times and bucket them
  const buckets: Record<string, number> = {
    "0-5min": 0,
    "5-10min": 0,
    "10-15min": 0,
    "15-20min": 0,
    "20-25min": 0,
    "25min+": 0,
  };

  for (const solver of solvers) {
    if (!solver.reachedPassedAt || !solver.match.startedAt) continue;

    const solveTimeMs =
      solver.reachedPassedAt.getTime() - solver.match.startedAt.getTime();
    const solveTimeMin = solveTimeMs / 60_000;

    if (solveTimeMin < 5) {
      buckets["0-5min"]++;
    } else if (solveTimeMin < 10) {
      buckets["5-10min"]++;
    } else if (solveTimeMin < 15) {
      buckets["10-15min"]++;
    } else if (solveTimeMin < 20) {
      buckets["15-20min"]++;
    } else if (solveTimeMin < 25) {
      buckets["20-25min"]++;
    } else {
      buckets["25min+"]++;
    }
  }

  return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
}

export async function getCategorySuccessRates(
  category?: string
): Promise<CategorySuccessRate[]> {
  // Get all completed matches with problems, optionally filtered by category
  const whereClause = {
    match: {
      status: MatchStatus.COMPLETED,
      problem: {
        ...(category ? { category } : {}),
      },
    },
  };

  const participants = await prisma.matchParticipant.findMany({
    where: whereClause,
    select: {
      passedCount: true,
      match: {
        select: {
          problem: {
            select: {
              category: true,
              testCases: {
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  // Group by category
  const categoryMap = new Map<
    string,
    { totalAttempts: number; successCount: number }
  >();

  for (const p of participants) {
    const cat = p.match.problem?.category;
    if (!cat) continue;

    const totalTests = p.match.problem?.testCases.length ?? 0;
    const passedAll = totalTests > 0 && p.passedCount >= totalTests;

    const entry = categoryMap.get(cat) ?? { totalAttempts: 0, successCount: 0 };
    entry.totalAttempts++;
    if (passedAll) {
      entry.successCount++;
    }
    categoryMap.set(cat, entry);
  }

  return Array.from(categoryMap.entries())
    .map(([cat, stats]) => ({
      category: cat,
      totalAttempts: stats.totalAttempts,
      successCount: stats.successCount,
      successRate:
        stats.totalAttempts > 0
          ? Math.round((stats.successCount / stats.totalAttempts) * 10000) /
            100
          : 0,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export async function getMedianElo(): Promise<number> {
  const users = await prisma.user.findMany({
    select: { elo: true },
    orderBy: { elo: "asc" },
  });

  if (users.length === 0) {
    return 0;
  }

  const mid = Math.floor(users.length / 2);

  if (users.length % 2 === 0) {
    return Math.round((users[mid - 1].elo + users[mid].elo) / 2);
  }

  return users[mid].elo;
}
