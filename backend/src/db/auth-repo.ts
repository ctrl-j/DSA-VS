import bcrypt from "bcrypt";
import { prisma } from "./client";
import { SALT_ROUNDS } from "./common";
import { SafeUser, toSafeUser } from "./types";

export async function registerUser(username: string, passwordRaw: string) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new Error("USERNAME_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(passwordRaw, SALT_ROUNDS);

  return prisma.user.create({
    data: {
      username,
      passwordHash,
      elo: 1200,
      profile: {
        create: {
          displayName: username,
        },
      },
    },
    select: {
      id: true,
      username: true,
      elo: true,
      isAdmin: true,
      isBanned: true,
    },
  });
}

export async function checkUserPassword(username: string, passwordAttempt: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    return null;
  }

  const isMatch = await bcrypt.compare(passwordAttempt, user.passwordHash);
  if (!isMatch) {
    return null;
  }

  return user.id;
}

export async function loginUser(
  username: string,
  passwordAttempt: string
): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      elo: true,
      isAdmin: true,
      isBanned: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return null;
  }

  const isMatch = await bcrypt.compare(passwordAttempt, user.passwordHash);
  if (!isMatch) {
    return null;
  }

  return toSafeUser(user);
}

export async function changeUserPassword(
  userId: string,
  oldPasswordRaw: string,
  newPasswordRaw: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const isMatch = await bcrypt.compare(oldPasswordRaw, user.passwordHash);
  if (!isMatch) {
    throw new Error("INVALID_OLD_PASSWORD");
  }

  const newHash = await bcrypt.hash(newPasswordRaw, SALT_ROUNDS);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

export async function updateUserPassword(userId: string, newPasswordRaw: string) {
  const newHash = await bcrypt.hash(newPasswordRaw, SALT_ROUNDS);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}
