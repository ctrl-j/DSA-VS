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
): Promise<{ id: string; title: string; statement: string; difficulty: Difficulty; category: string } | null> {
  const problem = await prisma.problem.findFirst({
    where: {
      isActive: true,
      ...(preferredDifficulty ? { difficulty: preferredDifficulty } : {}),
      ...(preferredCategory ? { category: preferredCategory } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      statement: true,
      difficulty: true,
      category: true,
    },
  });

  return problem;
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
