import bcrypt from "bcrypt";
import { MatchMode, MatchStatus } from "@prisma/client";
import { prisma } from "./client";
import { SALT_ROUNDS } from "./common";

export async function createPrivateMatch(
  hostUserId: string,
  hostElo: number,
  roomName: string,
  password: string
) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  return prisma.match.create({
    data: {
      mode: MatchMode.PRIVATE,
      status: MatchStatus.PENDING,
      roomName,
      passwordHash,
      participants: {
        create: [
          {
            userId: hostUserId,
            startElo: hostElo,
          },
        ],
      },
    },
    include: {
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
    },
  });
}

/**
 * Validates password and returns the PENDING lobby match with host info.
 * Does NOT activate the match — that happens via the `private.join` WS event.
 */
export async function validatePrivateMatchJoin(
  userId: string,
  roomName: string,
  password: string
) {
  const match = await prisma.match.findFirst({
    where: {
      roomName,
      mode: MatchMode.PRIVATE,
      status: MatchStatus.PENDING,
    },
    include: {
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
    },
  });

  if (!match) {
    throw new Error("MATCH_NOT_FOUND");
  }

  if (!match.passwordHash) {
    throw new Error("MATCH_NOT_FOUND");
  }

  const valid = await bcrypt.compare(password, match.passwordHash);
  if (!valid) {
    throw new Error("INVALID_PASSWORD");
  }

  const host = match.participants[0];
  if (!host) {
    throw new Error("MATCH_NOT_FOUND");
  }

  if (host.userId === userId) {
    throw new Error("CANNOT_JOIN_OWN_LOBBY");
  }

  return { lobbyMatchId: match.id, hostUserId: host.userId };
}

/**
 * Cancel a PENDING lobby match (called after the real ACTIVE match is created).
 */
export async function cancelPendingLobby(matchId: string) {
  await prisma.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.CANCELLED },
  });
}

export async function getPrivateMatchLobbies() {
  const lobbies = await prisma.match.findMany({
    where: {
      mode: MatchMode.PRIVATE,
      status: MatchStatus.PENDING,
    },
    select: {
      id: true,
      roomName: true,
      createdAt: true,
      participants: {
        select: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return lobbies.map((lobby) => ({
    id: lobby.id,
    roomName: lobby.roomName,
    createdAt: lobby.createdAt,
    hostUsername: lobby.participants[0]?.user.username ?? null,
    playerCount: lobby.participants.length,
  }));
}
