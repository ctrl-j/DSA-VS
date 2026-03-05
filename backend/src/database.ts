import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

export const prisma = new PrismaClient();
const SALT_ROUNDS = 12; // High enough to be secure, fast enough for UX

/**
 * REGISTRATION: Use this when a user first signs up.
 */
export async function registerUser(username: string, passwordRaw: string) {
  // Check if username already exists for explicit error testing
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new Error('USERNAME_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(passwordRaw, SALT_ROUNDS);
  
  return await prisma.user.create({
    data: {
      username,
      passwordHash,
      elo: 1200, 
    },
  });
}

/**
 * AUTHENTICATION: Password Checker
 */
export async function checkUserPassword(username: string, passwordAttempt: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, passwordHash: true },
  });

  if (!user) return null;

  const isMatch = await bcrypt.compare(passwordAttempt, user.passwordHash);
  return isMatch ? user.id : null;
}

/** 
 * UPDATING PASSWORD: Includes old password verification.
 */
export async function changeUserPassword(userId: string, oldPasswordRaw: string, newPasswordRaw: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  const isMatch = await bcrypt.compare(oldPasswordRaw, user.passwordHash);
  if (!isMatch) {
    throw new Error('INVALID_OLD_PASSWORD');
  }

  const newHash = await bcrypt.hash(newPasswordRaw, SALT_ROUNDS);
  return await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

// Simple wrapper for direct updates (legacy support)
export async function updateUserPassword(userId: string, newPasswordRaw: string) {
  const newHash = await bcrypt.hash(newPasswordRaw, SALT_ROUNDS);
  return await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

export async function getUserInfo(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
}

export async function getUserElo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { elo: true },
  });
  return user ? user.elo : null;
}

// Friends Management
export async function addFriend(userId: string, friendId: string) {
  const existingRequest = await prisma.friendRequest.findUnique({
    where: {
      requesterId_receiverId: {
        requesterId: userId,
        receiverId: friendId,
      },
    },
  });

  if (existingRequest) {
    if (existingRequest.status === 'ACCEPTED') {
      throw new Error('Already friends');
    }
    return await prisma.friendRequest.update({
      where: {
        requesterId_receiverId: {
          requesterId: userId,
          receiverId: friendId,
        },
      },
      data: { status: 'ACCEPTED' },
    });
  }

  return await prisma.friendRequest.create({
    data: {
      requesterId: userId,
      receiverId: friendId,
      status: 'ACCEPTED',
    },
  });
}

export async function acceptFriendRequest(requestId: string) {
  return await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: 'ACCEPTED' },
  });
}

export async function removeFriend(userId: string, friendId: string) {
  const friendRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { requesterId: userId, receiverId: friendId, status: 'ACCEPTED' },
        { requesterId: friendId, receiverId: userId, status: 'ACCEPTED' },
      ],
    },
  });

  if (!friendRequest) {
    throw new Error('Not friends');
  }

  return await prisma.friendRequest.delete({
    where: { id: friendRequest.id },
  });
}

export async function getFriends(userId: string) {
  const friends = await prisma.friendRequest.findMany({
    where: {
      OR: [
        { requesterId: userId, status: 'ACCEPTED' },
        { receiverId: userId, status: 'ACCEPTED' },
      ],
    },
    include: {
      requester: { select: { id: true, username: true } },
      receiver: { select: { id: true, username: true } },
    },
  });

  return friends.map(friend => friend.requesterId === userId ? friend.receiver : friend.requester);
}

// Blocked Users Management
export async function blockUser(blockerId: string, blockedId: string) {
  return await prisma.block.create({
    data: {
      blockerId,
      blockedId,
    },
  });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  return await prisma.block.delete({
    where: {
      blockerId_blockedId: {
        blockerId,
        blockedId,
      },
    },
  });
}

export async function getBlockedUsers(userId: string) {
  const blocks = await prisma.block.findMany({
    where: { blockerId: userId },
    include: {
      blocked: { select: { id: true, username: true } },
    },
  });

  return blocks.map(block => block.blocked);
}

// Chat History
export async function getChatHistory(userId1: string, userId2: string, limit: number = 50, offset: number = 0) {
  return await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    skip: offset,
  });
}

export async function sendMessage(senderId: string, receiverId: string, content: string) {
  const isBlocked = await prisma.block.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId: receiverId,
        blockedId: senderId,
      },
    },
  });

  if (isBlocked) {
    throw new Error("CANNOT_SEND_MESSAGE_BLOCKED");
  }

  return await prisma.message.create({
    data: {
      senderId,
      receiverId,
      content,
    },
  });
}

// Challenges (Simulated for Sprint 1)
export async function createChallenge(senderId: string, receiverId: string) {
  const isBlocked = await prisma.block.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId: receiverId,
        blockedId: senderId,
      },
    },
  });

  if (isBlocked) {
    throw new Error("CANNOT_CHALLENGE_BLOCKED");
  }

  return await prisma.message.create({
    data: {
      senderId,
      receiverId,
      content: "CHALLENGE_INVITE",
    },
  });
}

// Update ELO
export async function updateUserElo(userId: string, newElo: number) {
  return await prisma.user.update({
    where: { id: userId },
    data: { elo: newElo },
  });
}

// Profile Management
export async function updateProfile(userId: string, data: { displayName?: string, bio?: string, avatarUrl?: string }) {
  return await prisma.profile.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });
}

// Reporting & Bugs
export async function reportUser(reporterId: string, reportedId: string, reason: string) {
  return await prisma.report.create({
    data: {
      reporterId,
      reportedId,
      reason,
    },
  });
}

export async function createBugReport(reporterId: string | null, title: string, description: string) {
  return await prisma.bugReport.create({
    data: {
      reporterId,
      title,
      description,
    },
  });
}

export async function isUserBlocked(blockerId: string, blockedId: string) {
  const block = await prisma.block.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId,
        blockedId,
      },
    },
  });
  return !!block;
}

// Admin: Retrieve chats between 2 users
export async function getChatsBetweenUsers(userId1: string, userId2: string) {
  return await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    },
    include: {
      sender: { select: { id: true, username: true } },
      receiver: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}