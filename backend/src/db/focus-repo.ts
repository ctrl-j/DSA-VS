import { prisma } from "./client";

export async function recordFocusSession(
  userId: string,
  category: string,
  durationMs: number
) {
  return prisma.focusSession.create({
    data: {
      userId,
      category,
      durationMs,
      date: new Date(),
    },
  });
}

export async function getFocusByDayOfWeek(
  userId: string
): Promise<{ dayOfWeek: number; totalMs: number }[]> {
  const sessions = await prisma.focusSession.findMany({
    where: { userId },
    select: {
      date: true,
      durationMs: true,
    },
  });

  // Aggregate by day of week (0 = Sunday, 6 = Saturday)
  const byDay: Record<number, number> = {};
  for (let d = 0; d < 7; d++) {
    byDay[d] = 0;
  }

  for (const session of sessions) {
    const dayOfWeek = session.date.getDay();
    byDay[dayOfWeek] += session.durationMs;
  }

  return Object.entries(byDay).map(([day, totalMs]) => ({
    dayOfWeek: Number(day),
    totalMs,
  }));
}

export async function getFocusByCategory(
  userId: string
): Promise<{ category: string; totalMs: number }[]> {
  const sessions = await prisma.focusSession.findMany({
    where: { userId },
    select: {
      category: true,
      durationMs: true,
    },
  });

  const byCategory: Record<string, number> = {};

  for (const session of sessions) {
    byCategory[session.category] = (byCategory[session.category] ?? 0) + session.durationMs;
  }

  return Object.entries(byCategory).map(([category, totalMs]) => ({
    category,
    totalMs,
  }));
}
