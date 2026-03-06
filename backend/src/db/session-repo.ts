import { randomUUID } from "node:crypto";
import { prisma } from "./client";
import { expiresAtFrom, hashSessionToken, now } from "./common";
import { AuthenticatedSession, toSafeUser } from "./types";

export async function createSessionForUser(
  userId: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomUUID();
  const tokenHash = hashSessionToken(token);
  const current = now();
  const expiresAt = expiresAtFrom(current);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      lastActivityAt: current,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function deleteSessionByToken(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      tokenHash: hashSessionToken(token),
    },
  });
}

export async function deleteSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

export async function getSessionByToken(token: string): Promise<AuthenticatedSession | null> {
  const tokenHash = hashSessionToken(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          elo: true,
          isAdmin: true,
          isBanned: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const current = now();
  if (session.expiresAt.getTime() <= current.getTime()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  const refreshedExpiry = expiresAtFrom(current);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      lastActivityAt: current,
      expiresAt: refreshedExpiry,
    },
  });

  return {
    sessionId: session.id,
    userId: session.userId,
    expiresAt: refreshedExpiry,
    user: toSafeUser(session.user),
  };
}
