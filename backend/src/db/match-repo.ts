import {
  MatchMode,
  MatchStatus,
  SubmissionStatus,
  type Difficulty,
} from "@prisma/client";
import { prisma } from "./client";
import { now } from "./common";

export async function findProblemForMatch(
  preferredDifficulty?: Difficulty
): Promise<{ id: string; title: string; statement: string } | null> {
  const problem = await prisma.problem.findFirst({
    where: {
      isActive: true,
      ...(preferredDifficulty ? { difficulty: preferredDifficulty } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      statement: true,
    },
  });

  return problem;
}

export async function createMatchForUsers(
  userOne: { id: string; elo: number },
  userTwo: { id: string; elo: number },
  mode: MatchMode
) {
  const problem = await findProblemForMatch();

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

export async function getLeaderboard(limit = 100) {
  return prisma.user.findMany({
    orderBy: [{ elo: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      username: true,
      elo: true,
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
