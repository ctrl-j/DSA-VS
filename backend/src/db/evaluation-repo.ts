import { prisma } from "./client";

export async function getStudentCodeHistory(studentId: string, limit = 20) {
  return prisma.submission.findMany({
    where: {
      userId: studentId,
      match: {
        status: "COMPLETED",
      },
    },
    select: {
      id: true,
      language: true,
      code: true,
      passedCount: true,
      status: true,
      createdAt: true,
      match: {
        select: {
          id: true,
          mode: true,
          startedAt: true,
          endedAt: true,
          durationSec: true,
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              category: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function createEvaluation(
  instructorId: string,
  studentId: string,
  data: { matchId?: string; score: number; feedback?: string }
) {
  if (data.score < 0 || data.score > 100) {
    throw new Error("INVALID_SCORE");
  }

  // Verify the student exists
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true },
  });
  if (!student) {
    throw new Error("USER_NOT_FOUND");
  }

  // If matchId is provided, verify the match exists
  if (data.matchId) {
    const match = await prisma.match.findUnique({
      where: { id: data.matchId },
      select: { id: true },
    });
    if (!match) {
      throw new Error("MATCH_NOT_FOUND");
    }
  }

  return prisma.instructorEvaluation.create({
    data: {
      instructorId,
      studentId,
      matchId: data.matchId ?? null,
      score: data.score,
      feedback: data.feedback ?? null,
    },
    include: {
      instructor: {
        select: {
          id: true,
          username: true,
        },
      },
      student: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });
}

export async function getStudentEvaluations(studentId: string) {
  return prisma.instructorEvaluation.findMany({
    where: { studentId },
    include: {
      instructor: {
        select: {
          id: true,
          username: true,
        },
      },
      match: {
        select: {
          id: true,
          mode: true,
          startedAt: true,
          endedAt: true,
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              category: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStudentPerformanceScore(
  studentId: string
): Promise<number | null> {
  const result = await prisma.instructorEvaluation.aggregate({
    where: { studentId },
    _avg: { score: true },
    _count: { id: true },
  });

  if (result._count.id === 0) {
    return null;
  }

  return Math.round(result._avg.score ?? 0);
}
