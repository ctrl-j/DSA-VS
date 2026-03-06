import { MessageType } from "@prisma/client";
import { prisma } from "./client";
import { isBlockedEitherDirection } from "./social-repo";

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
