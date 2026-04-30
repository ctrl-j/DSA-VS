import { AchievementType } from "@prisma/client";
import { prisma } from "./client";

/** Achievement display metadata */
export const ACHIEVEMENT_META: Record<AchievementType, { name: string; description: string }> = {
  FIRST_BLOOD: { name: "First Blood", description: "Win your first 1v1 match." },
  WIN_STREAK_X3: { name: "Win Streak x3", description: "Win 3 ranked matches in a row." },
  UNDERDOG: { name: "Underdog", description: "Beat a player with higher Elo." },
  SPEED_CODER: { name: "Speed Coder", description: "Submit a correct solution in under 5 minutes." },
  PERFECT_RUN: { name: "Perfect Run", description: "Pass all test cases on first submission." },
  COMEBACK_KING: { name: "Comeback King", description: "Win after trailing in passed test cases." },
  POLYGLOT: { name: "Polyglot", description: "Win matches using 3 different languages." },
  DAILY_GRINDER: { name: "Daily Grinder", description: "Play 5 matches in one day." },
  TOP_100: { name: "Top 100", description: "Reach top 100 on leaderboard." },
  LEGEND: { name: "Legend", description: "Reach 2000+ Elo." },
};

export async function getUserAchievements(userId: string) {
  const achievements = await prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { earnedAt: "asc" },
  });

  return achievements.map((a) => ({
    id: a.id,
    type: a.type,
    name: ACHIEVEMENT_META[a.type].name,
    description: ACHIEVEMENT_META[a.type].description,
    earnedAt: a.earnedAt.toISOString(),
  }));
}

export async function awardAchievement(
  userId: string,
  type: AchievementType
): Promise<boolean> {
  const existing = await prisma.userAchievement.findUnique({
    where: { userId_type: { userId, type } },
  });
  if (existing) return false;

  await prisma.userAchievement.create({
    data: { userId, type },
  });
  return true;
}

export async function hasAchievement(
  userId: string,
  type: AchievementType
): Promise<boolean> {
  const existing = await prisma.userAchievement.findUnique({
    where: { userId_type: { userId, type } },
  });
  return existing !== null;
}

/** Context about the match that just completed, passed to achievement checker. */
export interface MatchAchievementContext {
  matchId: string;
  winnerUserId: string | null;
  participants: Array<{
    userId: string;
    startElo: number;
    endElo: number;
    passedCount: number;
  }>;
  totalTestCases: number;
  matchStartedAt: Date;
  matchMode: string;
}

/**
 * Check and award all applicable achievements for a user after a match ends.
 * Returns list of newly awarded achievement types.
 */
export async function checkAndAwardAchievements(
  userId: string,
  ctx: MatchAchievementContext
): Promise<AchievementType[]> {
  const awarded: AchievementType[] = [];

  const me = ctx.participants.find((p) => p.userId === userId);
  const opponent = ctx.participants.find((p) => p.userId !== userId);
  if (!me || !opponent) return awarded;

  const isWinner = ctx.winnerUserId === userId;

  // --- FIRST_BLOOD: Win your first 1v1 match ---
  if (isWinner) {
    if (await checkFirstBlood(userId)) awarded.push(AchievementType.FIRST_BLOOD);
  }

  // --- WIN_STREAK_X3: Win 3 ranked matches in a row ---
  if (isWinner && ctx.matchMode === "RANKED") {
    if (await checkWinStreakX3(userId)) awarded.push(AchievementType.WIN_STREAK_X3);
  }

  // --- UNDERDOG: Beat a player with higher Elo ---
  if (isWinner && me.startElo < opponent.startElo) {
    if (await awardAchievement(userId, AchievementType.UNDERDOG)) {
      awarded.push(AchievementType.UNDERDOG);
    }
  }

  // --- SPEED_CODER: Submit a correct solution in under 5 minutes ---
  if (await checkSpeedCoder(userId, ctx)) awarded.push(AchievementType.SPEED_CODER);

  // --- PERFECT_RUN: Pass all test cases on first submission ---
  if (await checkPerfectRun(userId, ctx)) awarded.push(AchievementType.PERFECT_RUN);

  // --- COMEBACK_KING: Win after trailing in passed test cases ---
  if (isWinner) {
    if (await checkComebackKing(userId, ctx)) awarded.push(AchievementType.COMEBACK_KING);
  }

  // --- POLYGLOT: Win matches using 3 different languages ---
  if (isWinner) {
    if (await checkPolyglot(userId)) awarded.push(AchievementType.POLYGLOT);
  }

  // --- DAILY_GRINDER: Play 5 matches in one day ---
  if (await checkDailyGrinder(userId)) awarded.push(AchievementType.DAILY_GRINDER);

  // --- TOP_100: Reach top 100 on leaderboard ---
  if (await checkTop100(userId)) awarded.push(AchievementType.TOP_100);

  // --- LEGEND: Reach 2000+ Elo ---
  if (me.endElo >= 2000) {
    if (await awardAchievement(userId, AchievementType.LEGEND)) {
      awarded.push(AchievementType.LEGEND);
    }
  }

  return awarded;
}

// ---- Individual achievement checks ----

async function checkFirstBlood(userId: string): Promise<boolean> {
  if (await hasAchievement(userId, AchievementType.FIRST_BLOOD)) return false;

  // Count completed matches where this user won
  const wins = await countWins(userId);
  if (wins >= 1) {
    return awardAchievement(userId, AchievementType.FIRST_BLOOD);
  }
  return false;
}

async function checkWinStreakX3(userId: string): Promise<boolean> {
  if (await hasAchievement(userId, AchievementType.WIN_STREAK_X3)) return false;

  // Get last 3 ranked completed matches for this user
  const recentParticipations = await prisma.matchParticipant.findMany({
    where: {
      userId,
      match: { status: "COMPLETED", mode: "RANKED" },
    },
    include: {
      match: {
        include: {
          participants: true,
        },
      },
    },
    orderBy: { match: { endedAt: "desc" } },
    take: 3,
  });

  if (recentParticipations.length < 3) return false;

  const allWins = recentParticipations.every((mp) => {
    const opponent = mp.match.participants.find((p) => p.userId !== userId);
    if (!opponent) return false;
    return mp.passedCount > opponent.passedCount;
  });

  if (allWins) {
    return awardAchievement(userId, AchievementType.WIN_STREAK_X3);
  }
  return false;
}

async function checkSpeedCoder(
  userId: string,
  ctx: MatchAchievementContext
): Promise<boolean> {
  if (await hasAchievement(userId, AchievementType.SPEED_CODER)) return false;

  // Find the user's first submission in this match that passed all tests
  const perfectSubmission = await prisma.submission.findFirst({
    where: {
      matchId: ctx.matchId,
      userId,
      passedCount: { gte: ctx.totalTestCases },
      status: "COMPLETED",
    },
    orderBy: { createdAt: "asc" },
  });

  if (!perfectSubmission) return false;

  const elapsedMs = perfectSubmission.createdAt.getTime() - ctx.matchStartedAt.getTime();
  const fiveMinutesMs = 5 * 60 * 1000;

  if (elapsedMs <= fiveMinutesMs) {
    return awardAchievement(userId, AchievementType.SPEED_CODER);
  }
  return false;
}

async function checkPerfectRun(
  userId: string,
  ctx: MatchAchievementContext
): Promise<boolean> {
  if (await hasAchievement(userId, AchievementType.PERFECT_RUN)) return false;

  // Get all submissions for this user in this match, ordered by creation
  const submissions = await prisma.submission.findMany({
    where: {
      matchId: ctx.matchId,
      userId,
      status: "COMPLETED",
    },
    orderBy: { createdAt: "asc" },
  });

  if (submissions.length === 0) return false;

  // First completed submission must pass all test cases
  if (submissions[0].passedCount >= ctx.totalTestCases) {
    return awardAchievement(userId, AchievementType.PERFECT_RUN);
  }
  return false;
}

async function checkComebackKing(
  userId: string,
  ctx: MatchAchievementContext
): Promise<boolean> {
  if (await hasAchievement(userId, AchievementType.COMEBACK_KING)) return false;

  const opponentId = ctx.participants.find((p) => p.userId !== userId)?.userId;
  if (!opponentId) return false;

  // Get all submissions in this match ordered by time
  const allSubmissions = await prisma.submission.findMany({
    where: {
      matchId: ctx.matchId,
      status: "COMPLETED",
    },
    orderBy: { createdAt: "asc" },
  });

  // Track best passedCount for each player over time
  let myBest = 0;
  let opponentBest = 0;
  let wasTrailing = false;

  for (const sub of allSubmissions) {
    if (sub.userId === userId) {
      myBest = Math.max(myBest, sub.passedCount);
    } else if (sub.userId === opponentId) {
      opponentBest = Math.max(opponentBest, sub.passedCount);
    }
    // Check if user was trailing at any point
    if (myBest < opponentBest) {
      wasTrailing = true;
    }
  }

  if (wasTrailing) {
    return awardAchievement(userId, AchievementType.COMEBACK_KING);
  }
  return false;
}

async function checkPolyglot(userId: string): Promise<boolean> {
  if (await hasAchievement(userId, AchievementType.POLYGLOT)) return false;

  // Find distinct languages used in won matches
  const wonParticipations = await prisma.matchParticipant.findMany({
    where: {
      userId,
      match: { status: "COMPLETED" },
      language: { not: null },
    },
    include: {
      match: {
        include: {
          participants: true,
        },
      },
    },
  });

  const winningLanguages = new Set<string>();
  for (const mp of wonParticipations) {
    const opponent = mp.match.participants.find((p) => p.userId !== userId);
    if (!opponent) continue;
    if (mp.passedCount > opponent.passedCount && mp.language) {
      winningLanguages.add(mp.language);
    }
  }

  if (winningLanguages.size >= 3) {
    return awardAchievement(userId, AchievementType.POLYGLOT);
  }
  return false;
}

async function checkDailyGrinder(userId: string): Promise<boolean> {
  if (await hasAchievement(userId, AchievementType.DAILY_GRINDER)) return false;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const matchesToday = await prisma.matchParticipant.count({
    where: {
      userId,
      match: {
        status: "COMPLETED",
        endedAt: { gte: todayStart, lte: todayEnd },
      },
    },
  });

  if (matchesToday >= 5) {
    return awardAchievement(userId, AchievementType.DAILY_GRINDER);
  }
  return false;
}

async function checkTop100(userId: string): Promise<boolean> {
  if (await hasAchievement(userId, AchievementType.TOP_100)) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { elo: true },
  });
  if (!user) return false;

  // Count how many users have higher ELO
  const higherCount = await prisma.user.count({
    where: { elo: { gt: user.elo } },
  });

  // Position is higherCount + 1
  if (higherCount + 1 <= 100) {
    return awardAchievement(userId, AchievementType.TOP_100);
  }
  return false;
}

async function countWins(userId: string): Promise<number> {
  const participations = await prisma.matchParticipant.findMany({
    where: {
      userId,
      match: { status: "COMPLETED" },
    },
    include: {
      match: {
        include: {
          participants: true,
        },
      },
    },
  });

  let wins = 0;
  for (const mp of participations) {
    const opponent = mp.match.participants.find((p) => p.userId !== userId);
    if (!opponent) continue;
    if (mp.passedCount > opponent.passedCount) {
      wins++;
    }
  }
  return wins;
}