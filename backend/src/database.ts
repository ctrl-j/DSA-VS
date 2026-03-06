import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  FriendRequestStatus,
  MatchMode,
  MatchStatus,
  MessageType,
  PrismaClient,
  ReportStatus,
  SubmissionStatus,
  type Difficulty,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Prisma client.");
}

const pgPool = new Pool({ connectionString: databaseUrl });
const prismaAdapter = new PrismaPg(pgPool);

export const prisma = new PrismaClient({ adapter: prismaAdapter });

const SALT_ROUNDS = 12;
const DEFAULT_SESSION_TIMEOUT_MINUTES = 15;

function now(): Date {
  return new Date();
}

function sessionTimeoutMinutes(): number {
  const parsed = Number(process.env.SESSION_TIMEOUT_MINUTES);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return DEFAULT_SESSION_TIMEOUT_MINUTES;
}

function expiresAtFrom(base: Date): Date {
  return new Date(base.getTime() + sessionTimeoutMinutes() * 60_000);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface SafeUser {
  id: string;
  username: string;
  elo: number;
  isAdmin: boolean;
  isBanned: boolean;
}

export interface AuthenticatedSession {
  sessionId: string;
  userId: string;
  expiresAt: Date;
  user: SafeUser;
}

function toSafeUser(user: {
  id: string;
  username: string;
  elo: number;
  isAdmin: boolean;
  isBanned: boolean;
}): SafeUser {
  return {
    id: user.id,
    username: user.username,
    elo: user.elo,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
  };
}

export interface PublicUserSummary {
  id: string;
  username: string;
}

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

async function isBlockedEitherDirection(userIdA: string, userIdB: string): Promise<boolean> {
  const blocks = await prisma.block.findFirst({
    where: {
      OR: [
        {
          blockerId: userIdA,
          blockedId: userIdB,
        },
        {
          blockerId: userIdB,
          blockedId: userIdA,
        },
      ],
    },
    select: { blockerId: true },
  });

  return Boolean(blocks);
}

export async function createFriendRequest(userId: string, friendId: string) {
  if (userId === friendId) {
    throw new Error("CANNOT_FRIEND_SELF");
  }

  const existingDirect = await prisma.friendRequest.findUnique({
    where: {
      requesterId_receiverId: {
        requesterId: userId,
        receiverId: friendId,
      },
    },
  });

  if (existingDirect) {
    if (existingDirect.status === FriendRequestStatus.ACCEPTED) {
      throw new Error("ALREADY_FRIENDS");
    }
    if (existingDirect.status === FriendRequestStatus.PENDING) {
      throw new Error("REQUEST_ALREADY_PENDING");
    }

    return prisma.friendRequest.update({
      where: { id: existingDirect.id },
      data: { status: FriendRequestStatus.PENDING },
    });
  }

  const existingReverse = await prisma.friendRequest.findUnique({
    where: {
      requesterId_receiverId: {
        requesterId: friendId,
        receiverId: userId,
      },
    },
  });

  if (existingReverse && existingReverse.status === FriendRequestStatus.PENDING) {
    return prisma.friendRequest.update({
      where: { id: existingReverse.id },
      data: { status: FriendRequestStatus.ACCEPTED },
    });
  }

  if (existingReverse && existingReverse.status === FriendRequestStatus.ACCEPTED) {
    throw new Error("ALREADY_FRIENDS");
  }

  return prisma.friendRequest.create({
    data: {
      requesterId: userId,
      receiverId: friendId,
      status: FriendRequestStatus.PENDING,
    },
  });
}

export async function addFriend(userId: string, friendId: string) {
  return createFriendRequest(userId, friendId);
}

export async function acceptFriendRequest(requestId: string, receiverId?: string) {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("FRIEND_REQUEST_NOT_FOUND");
  }

  if (receiverId && request.receiverId !== receiverId) {
    throw new Error("FORBIDDEN");
  }

  return prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: FriendRequestStatus.ACCEPTED },
  });
}

export async function declineFriendRequest(requestId: string, receiverId?: string) {
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("FRIEND_REQUEST_NOT_FOUND");
  }

  if (receiverId && request.receiverId !== receiverId) {
    throw new Error("FORBIDDEN");
  }

  return prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: FriendRequestStatus.DECLINED },
  });
}

export async function removeFriend(userId: string, friendId: string) {
  const friendRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { requesterId: userId, receiverId: friendId, status: FriendRequestStatus.ACCEPTED },
        { requesterId: friendId, receiverId: userId, status: FriendRequestStatus.ACCEPTED },
      ],
    },
  });

  if (!friendRequest) {
    throw new Error("NOT_FRIENDS");
  }

  return prisma.friendRequest.delete({
    where: { id: friendRequest.id },
  });
}

export async function getFriends(userId: string): Promise<PublicUserSummary[]> {
  const friends = await prisma.friendRequest.findMany({
    where: {
      OR: [
        { requesterId: userId, status: FriendRequestStatus.ACCEPTED },
        { receiverId: userId, status: FriendRequestStatus.ACCEPTED },
      ],
    },
    include: {
      requester: { select: { id: true, username: true } },
      receiver: { select: { id: true, username: true } },
    },
  });

  return friends.map((friend): PublicUserSummary => {
    if (friend.requesterId === userId) {
      return friend.receiver;
    }
    return friend.requester;
  });
}

export async function getPendingFriendRequests(userId: string) {
  return prisma.friendRequest.findMany({
    where: {
      receiverId: userId,
      status: FriendRequestStatus.PENDING,
    },
    include: {
      requester: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    throw new Error("CANNOT_BLOCK_SELF");
  }

  await prisma.friendRequest.deleteMany({
    where: {
      OR: [
        {
          requesterId: blockerId,
          receiverId: blockedId,
        },
        {
          requesterId: blockedId,
          receiverId: blockerId,
        },
      ],
    },
  });

  return prisma.block.upsert({
    where: {
      blockerId_blockedId: {
        blockerId,
        blockedId,
      },
    },
    update: {},
    create: {
      blockerId,
      blockedId,
    },
  });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  return prisma.block.deleteMany({
    where: {
      blockerId,
      blockedId,
    },
  });
}

export async function getBlockedUsers(userId: string): Promise<PublicUserSummary[]> {
  const blocks = await prisma.block.findMany({
    where: { blockerId: userId },
    include: {
      blocked: { select: { id: true, username: true } },
    },
  });

  return blocks.map((block): PublicUserSummary => block.blocked);
}

export async function getChatHistory(
  userId1: string,
  userId2: string,
  limit = 50,
  offset = 0
) {
  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    skip: offset,
  });
}

export async function sendMessage(senderId: string, receiverId: string, content: string) {
  if (senderId === receiverId) {
    throw new Error("CANNOT_MESSAGE_SELF");
  }

  const blocked = await isBlockedEitherDirection(senderId, receiverId);
  if (blocked) {
    throw new Error("CANNOT_SEND_MESSAGE_BLOCKED");
  }

  return prisma.message.create({
    data: {
      senderId,
      receiverId,
      type: MessageType.TEXT,
      content,
    },
  });
}

export async function createChallenge(senderId: string, receiverId: string) {
  if (senderId === receiverId) {
    throw new Error("CANNOT_CHALLENGE_SELF");
  }

  const blocked = await isBlockedEitherDirection(senderId, receiverId);
  if (blocked) {
    throw new Error("CANNOT_CHALLENGE_BLOCKED");
  }

  return prisma.message.create({
    data: {
      senderId,
      receiverId,
      type: MessageType.CHALLENGE,
      content: "Challenge invite",
    },
  });
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

export async function reportUser(reporterId: string, reportedId: string, reason: string) {
  if (reporterId === reportedId) {
    throw new Error("CANNOT_REPORT_SELF");
  }

  return prisma.report.create({
    data: {
      reporterId,
      reportedId,
      reason,
      status: ReportStatus.OPEN,
    },
  });
}

export async function createBugReport(
  reporterId: string | null,
  title: string,
  description: string
) {
  return prisma.bugReport.create({
    data: {
      reporterId,
      title,
      description,
    },
  });
}

export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
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

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return Boolean(user?.isAdmin);
}

export async function getChatsBetweenUsers(userId1: string, userId2: string) {
  return prisma.message.findMany({
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
    orderBy: { createdAt: "asc" },
  });
}

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
