import { prisma } from "./client";
import { SafeUser, toSafeUser } from "./types";

export async function getUserById(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      elo: true,
      isAdmin: true,
      isBanned: true,
    },
  });

  if (!user) {
    return null;
  }

  return toSafeUser(user);
}

export async function getUserByUsername(username: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      elo: true,
      isAdmin: true,
      isBanned: true,
    },
  });

  if (!user) {
    return null;
  }

  return toSafeUser(user);
}

export async function getUserInfo(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
}

export async function getUserElo(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { elo: true },
  });
  return user ? user.elo : null;
}

export async function updateUserElo(userId: string, newElo: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { elo: newElo },
  });
}

export async function updateProfile(
  userId: string,
  data: { displayName?: string; bio?: string; avatarUrl?: string }
) {
  return prisma.profile.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });
}

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return Boolean(user?.isAdmin);
}
