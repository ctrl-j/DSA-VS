import {
  MatchMode,
  MatchStatus,
  SubmissionStatus,
  type Difficulty,
} from "@prisma/client";
import { prisma } from "./client";
import { now } from "./common";

export async function findProblemForMatch(
  preferredDifficulty?: Difficulty,
  preferredCategory?: string
): Promise<
  { id: string; title: string; statement: string; difficulty?: Difficulty; category?: string } | null
> {
  const where = {
    isActive: true,
    ...(preferredDifficulty ? { difficulty: preferredDifficulty } : {}),
    ...(preferredCategory ? { category: preferredCategory } : {}),
  };

  const problems = await prisma.problem.findMany({
    where,
    select: {
      id: true,
      title: true,
      statement: true,
      difficulty: true,
      category: true,
    },
  });

  if (Array.isArray(problems) && problems.length > 0) {
    const index = Math.floor(Math.random() * problems.length);
    return problems[index];
  }

  const fallback = await prisma.problem.findFirst({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      statement: true,
      difficulty: true,
      category: true,
    },
  });

  return fallback ?? null;
}

export async function createMatchForUsers(
  userOne: { id: string; elo: number },
  userTwo: { id: string; elo: number },
  mode: MatchMode,
  preferredDifficulty?: Difficulty,
  preferredCategory?: string
) {
  const problem = await findProblemForMatch(preferredDifficulty, preferredCategory);

  return prisma.match.create({
    data: {
      mode,
      status: MatchStatus.ACTIVE,
      problemId: problem ? problem.id : null,
      startedAt: now(),
      participants: {
        create: [
          {
            userId: userOne.id,
            startElo: userOne.elo,
          },
          {
            userId: userTwo.id,
            startElo: userTwo.elo,
          },
        ],
      },
    },
    include: {
      participants: true,
      problem: {
        select: {
          id: true,
          title: true,
          statement: true,
          difficulty: true,
          category: true,
        },
      },
    },
  });
}

export async function completeMatch(
  matchId: string,
  participantA: { userId: string; endElo: number; passedCount: number },
  participantB: { userId: string; endElo: number; passedCount: number }
) {
  const completedAt = now();

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      status: MatchStatus.COMPLETED,
      endedAt: completedAt,
      durationSec: {
        set: 0,
      },
      participants: {
        update: [
          {
            where: {
              matchId_userId: {
                matchId,
                userId: participantA.userId,
              },
            },
            data: {
              endElo: participantA.endElo,
              passedCount: participantA.passedCount,
            },
          },
          {
            where: {
              matchId_userId: {
                matchId,
                userId: participantB.userId,
              },
            },
            data: {
              endElo: participantB.endElo,
              passedCount: participantB.passedCount,
            },
          },
        ],
      },
    },
    include: {
      participants: true,
    },
  });

  await prisma.user.update({
    where: { id: participantA.userId },
    data: { elo: participantA.endElo },
  });
  await prisma.user.update({
    where: { id: participantB.userId },
    data: { elo: participantB.endElo },
  });

  return match;
}

export async function createSubmission(
  matchId: string,
  userId: string,
  language: string,
  code: string
) {
  return prisma.submission.create({
    data: {
      matchId,
      userId,
      language,
      code,
      status: SubmissionStatus.QUEUED,
    },
  });
}

export async function updateSubmission(
  submissionId: string,
  data: { status?: SubmissionStatus; passedCount?: number }
) {
  return prisma.submission.update({
    where: { id: submissionId },
    data,
  });
}

export async function updateMatchParticipantProgress(
  matchId: string,
  userId: string,
  passedCount: number
) {
  return prisma.matchParticipant.update({
    where: {
      matchId_userId: {
        matchId,
        userId,
      },
    },
    data: {
      passedCount,
      reachedPassedAt: now(),
    },
  });
}

export async function getMatchById(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      problem: true,
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              elo: true,
            },
          },
        },
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function getMatchHistory(
  userId: string,
  limit = 20,
  offset = 0,
  category?: string,
  mode?: MatchMode
) {
  return prisma.matchParticipant.findMany({
    where: {
      userId,
      match: {
        ...(mode ? { mode } : {}),
        ...(category
          ? {
              problem: {
                category,
              },
            }
          : {}),
      },
    },
    include: {
      match: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              category: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      match: {
        createdAt: "desc",
      },
    },
    take: limit,
    skip: offset,
  });
}

export async function setMatchParticipantLanguage(
  matchId: string,
  userId: string,
  language: string
) {
  return prisma.matchParticipant.update({
    where: {
      matchId_userId: {
        matchId,
        userId,
      },
    },
    data: {
      language,
    },
  });
}

export async function createProblem(data: {
  title: string;
  statement: string;
  difficulty: Difficulty;
  category: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}) {
  return prisma.problem.create({
    data: {
      ...data,
      isActive: true,
    },
  });
}

export async function addTestCase(
  problemId: string,
  input: string,
  expectedOutput: string,
  isHidden = true
) {
  return prisma.testCase.create({
    data: {
      problemId,
      input,
      expectedOutput,
      isHidden,
    },
  });
}

export async function getTestCases(problemId: string, includeHidden = false) {
  return prisma.testCase.findMany({
    where: {
      problemId,
      ...(includeHidden ? {} : { isHidden: false }),
    },
  });
}

export async function getLeaderboard(limit = 100, sortBy: "elo" | "createdAt" = "elo") {
  return prisma.user.findMany({
    orderBy: sortBy === "elo" ? [{ elo: "desc" }, { createdAt: "asc" }] : [{ createdAt: "desc" }],
    select: {
      id: true,
      username: true,
      elo: true,
      createdAt: true,
    },
    take: limit,
  });
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  elo: number;
  winRate: number;
  rank: number;
}

/**
 * Returns top users by elo descending, with win rate as a tiebreaker.
 * A "win" is when a user's passedCount is strictly greater than the
 * opponent's passedCount in a COMPLETED match.
 */
export async function getLeaderboardWithStats(
  limit = 100
): Promise<LeaderboardEntry[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      username: string;
      elo: number;
      total_matches: bigint;
      wins: bigint;
    }>
  >`
    SELECT
      u.id,
      u.username,
      u.elo,
      COUNT(mp."matchId")::bigint AS total_matches,
      COUNT(CASE WHEN mp."passedCount" > opp."passedCount" THEN 1 END)::bigint AS wins
    FROM "User" u
    LEFT JOIN "MatchParticipant" mp ON mp."userId" = u.id
    LEFT JOIN "Match" m ON m.id = mp."matchId" AND m.status = 'COMPLETED'
    LEFT JOIN "MatchParticipant" opp ON opp."matchId" = mp."matchId" AND opp."userId" != u.id
      AND m.id IS NOT NULL
    WHERE u."isBanned" = false
    GROUP BY u.id, u.username, u.elo
    ORDER BY u.elo DESC,
      CASE WHEN COUNT(mp."matchId") = 0 THEN 0
           ELSE COUNT(CASE WHEN mp."passedCount" > opp."passedCount" THEN 1 END)::float / COUNT(mp."matchId")
      END DESC,
      u."createdAt" ASC
    LIMIT ${limit}
  `;

  return rows.map((row, index) => {
    const totalMatches = Number(row.total_matches);
    const wins = Number(row.wins);
    return {
      id: row.id,
      username: row.username,
      elo: row.elo,
      winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 10000) / 10000 : 0,
      rank: index + 1,
    };
  });
}

/**
 * Returns a single user's leaderboard position (1-indexed), elo, and win rate.
 * Rank is determined by how many non-banned users have a higher elo, or the
 * same elo but a higher win rate.
 */
export async function getUserLeaderboardPosition(
  userId: string
): Promise<{ rank: number; elo: number; winRate: number } | null> {
  // First get the user's stats
  const userRows = await prisma.$queryRaw<
    Array<{
      id: string;
      elo: number;
      total_matches: bigint;
      wins: bigint;
    }>
  >`
    SELECT
      u.id,
      u.elo,
      COUNT(mp."matchId")::bigint AS total_matches,
      COUNT(CASE WHEN mp."passedCount" > opp."passedCount" THEN 1 END)::bigint AS wins
    FROM "User" u
    LEFT JOIN "MatchParticipant" mp ON mp."userId" = u.id
    LEFT JOIN "Match" m ON m.id = mp."matchId" AND m.status = 'COMPLETED'
    LEFT JOIN "MatchParticipant" opp ON opp."matchId" = mp."matchId" AND opp."userId" != u.id
      AND m.id IS NOT NULL
    WHERE u.id = ${userId}
    GROUP BY u.id, u.elo
  `;

  if (userRows.length === 0) {
    return null;
  }

  const userRow = userRows[0];
  const totalMatches = Number(userRow.total_matches);
  const wins = Number(userRow.wins);
  const userWinRate = totalMatches > 0 ? wins / totalMatches : 0;

  // Count how many non-banned users rank above this user
  // A user ranks above if they have higher elo, or same elo but higher win rate,
  // or same elo and same win rate but earlier createdAt
  const rankRows = await prisma.$queryRaw<Array<{ rank: bigint }>>`
    SELECT COUNT(*) + 1 AS rank
    FROM (
      SELECT
        u2.id,
        u2.elo,
        u2."createdAt",
        CASE WHEN COUNT(mp2."matchId") = 0 THEN 0
             ELSE COUNT(CASE WHEN mp2."passedCount" > opp2."passedCount" THEN 1 END)::float / COUNT(mp2."matchId")
        END AS win_rate
      FROM "User" u2
      LEFT JOIN "MatchParticipant" mp2 ON mp2."userId" = u2.id
      LEFT JOIN "Match" m2 ON m2.id = mp2."matchId" AND m2.status = 'COMPLETED'
      LEFT JOIN "MatchParticipant" opp2 ON opp2."matchId" = mp2."matchId" AND opp2."userId" != u2.id
        AND m2.id IS NOT NULL
      WHERE u2."isBanned" = false AND u2.id != ${userId}
      GROUP BY u2.id, u2.elo, u2."createdAt"
    ) AS others
    WHERE others.elo > ${userRow.elo}
      OR (others.elo = ${userRow.elo} AND others.win_rate > ${userWinRate})
      OR (others.elo = ${userRow.elo} AND others.win_rate = ${userWinRate} AND others."createdAt" < (
        SELECT "createdAt" FROM "User" WHERE id = ${userId}
      ))
  `;

  const rank = Number(rankRows[0].rank);

  return {
    rank,
    elo: userRow.elo,
    winRate: Math.round(userWinRate * 10000) / 10000,
  };
}

export async function saveDraft(matchId: string, userId: string, code: string) {
  return prisma.draft.upsert({
    where: {
      matchId_userId: {
        matchId,
        userId,
      },
    },
    create: {
      matchId,
      userId,
      code,
    },
    update: {
      code,
    },
  });
}

export async function cancelMatch(matchId: string) {
  return prisma.match.update({
    where: { id: matchId },
    data: {
      status: MatchStatus.CANCELLED,
      endedAt: now(),
    },
  });
}

export async function getDraft(matchId: string, userId: string) {
  return prisma.draft.findUnique({
    where: {
      matchId_userId: {
        matchId,
        userId,
      },
    },
  });
}
