import { FriendRequestStatus } from "@prisma/client";
import { prisma } from "./client";
import { PublicUserSummary } from "./types";

export async function isBlockedEitherDirection(userIdA: string, userIdB: string): Promise<boolean> {
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
