import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { URL } from "node:url";
import { MatchMode } from "@prisma/client";
import { WebSocket, WebSocketServer } from "ws";
import {
  cancelMatch,
  completeMatch,
  createChallenge,
  createMatchForUsers,
  createSubmission,
  getMatchById,
  getSessionByToken,
  getUserById,
  getUserByUsername,
  sendMessage,
} from "../database";
import type { GlobalMatchQueue } from "../global-match-queue";
import { User } from "../user";
import { getTrimmedString, isObject, mapKnownError, modeToEnum } from "./http-utils";
import { ActiveMatchTimer, LiveWebSocket, WsAuthContext, WsEvent } from "./types";
import { enqueueSubmission } from "../judge/execution-queue";

export interface WsRuntime {
  wsServer: WebSocketServer;
  sendToUser: (userId: string, event: string, payload: unknown) => void;
  handleUpgrade: (request: IncomingMessage, socket: Socket, head: Buffer) => void;
  getClientCount: () => number;
  endMatchEarly: (matchId: string, reason: string) => Promise<void>;
}

export function createWsRuntime(globalMatchQueue: GlobalMatchQueue): WsRuntime {
  const wsServer = new WebSocketServer({ noServer: true });
  const socketsByUserId = new Map<string, Set<LiveWebSocket>>();
  const userIdBySocket = new Map<LiveWebSocket, WsAuthContext>();
  const activeMatchTimers = new Map<string, ActiveMatchTimer>();
  // Track pending cancel votes: matchId → userId of the player who requested
  const pendingCancelVotes = new Map<string, string>();

  function sendWsEvent(socket: LiveWebSocket, event: string, payload: unknown): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify({ event, payload }));
  }

  function sendToUser(userId: string, event: string, payload: unknown): void {
    const sockets = socketsByUserId.get(userId);
    if (!sockets) {
      return;
    }
    for (const socket of sockets) {
      sendWsEvent(socket, event, payload);
    }
  }

  function removeSocket(socket: LiveWebSocket): void {
    const context = userIdBySocket.get(socket);
    if (!context) {
      return;
    }

    userIdBySocket.delete(socket);

    const existing = socketsByUserId.get(context.userId);
    if (!existing) {
      return;
    }

    existing.delete(socket);
    if (existing.size === 0) {
      socketsByUserId.delete(context.userId);
    }
  }

  function calculateElo(myElo: number, opponentElo: number, score: number): number {
    const expected = 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400));
    const k = myElo >= 2000 ? 24 : 32;
    return Math.round(myElo + k * (score - expected));
  }

  async function finalizeMatch(matchId: string, reason: string): Promise<void> {
    try {
      const match = await getMatchById(matchId);
      if (!match || match.participants.length !== 2 || match.status !== "ACTIVE") {
        return;
      }

      const first = match.participants[0];
      const second = match.participants[1];

      const scoreA =
        first.passedCount > second.passedCount
          ? 1
          : second.passedCount > first.passedCount
            ? 0
            : 0.5;
      const scoreB = 1 - scoreA;

      const newEloA = calculateElo(first.startElo, second.startElo, scoreA);
      const newEloB = calculateElo(second.startElo, first.startElo, scoreB);

      await completeMatch(
        matchId,
        { userId: first.userId, endElo: newEloA, passedCount: first.passedCount },
        { userId: second.userId, endElo: newEloB, passedCount: second.passedCount }
      );

      let winnerUserId: string | null = null;
      if (scoreA === 1) {
        winnerUserId = first.userId;
      } else if (scoreB === 1) {
        winnerUserId = second.userId;
      }

      sendToUser(first.userId, "match.ended", {
        matchId,
        winnerUserId,
        reason,
        eloDelta: newEloA - first.startElo,
      });
      sendToUser(second.userId, "match.ended", {
        matchId,
        winnerUserId,
        reason,
        eloDelta: newEloB - second.startElo,
      });
    } catch (error) {
      console.error("Failed to finalize match", error);
    }
  }

  function startMatchTimer(matchId: string, participantIds: [string, string]): void {
    const existing = activeMatchTimers.get(matchId);
    if (existing) {
      clearInterval(existing.interval);
    }

    const totalMs = 25 * 60 * 1000;
    const endsAtMs = Date.now() + totalMs;

    const interval = setInterval(async () => {
      const remainingMs = Math.max(0, endsAtMs - Date.now());

      sendToUser(participantIds[0], "match.tick", {
        matchId,
        remainingMs,
      });
      sendToUser(participantIds[1], "match.tick", {
        matchId,
        remainingMs,
      });

      if (remainingMs > 0) {
        return;
      }

      clearInterval(interval);
      activeMatchTimers.delete(matchId);

      await finalizeMatch(matchId, "timer_expired");
    }, 1000);

    activeMatchTimers.set(matchId, {
      interval,
      endsAtMs,
      participantIds,
    });
  }

  async function handleWsEvent(socket: LiveWebSocket, event: WsEvent): Promise<void> {
    const context = userIdBySocket.get(socket);
    if (!context) {
      sendWsEvent(socket, "error", {
        code: "UNAUTHORIZED",
        message: "Socket is not authenticated.",
      });
      return;
    }

    if (event.event === "queue.join") {
      if (!isObject(event.payload)) {
        sendWsEvent(socket, "error", {
          code: "VALIDATION_ERROR",
          message: "payload object is required.",
        });
        return;
      }

      const mode = getTrimmedString(event.payload.mode);
      if (mode !== "ranked" && mode !== "ffa") {
        sendWsEvent(socket, "error", {
          code: "VALIDATION_ERROR",
          message: "mode must be ranked or ffa.",
        });
        return;
      }

      const currentUser = await getUserById(context.userId);
      if (!currentUser) {
        sendWsEvent(socket, "error", {
          code: "NOT_FOUND",
          message: "user not found.",
        });
        return;
      }

      const queueResult = globalMatchQueue.join(
        new User({
          userId: currentUser.id,
          username: currentUser.username,
          elo: currentUser.elo,
          authenticated: true,
        }),
        mode
      );

      sendWsEvent(socket, "queue.state", {
        mode,
        position: queueResult.position,
        queued: true,
      });

      if (queueResult.pair) {
        const firstUser = queueResult.pair.users[0];
        const secondUser = queueResult.pair.users[1];

        const firstDbUser = await getUserById(firstUser.userId);
        const secondDbUser = await getUserById(secondUser.userId);

        if (!firstDbUser || !secondDbUser) {
          return;
        }

        const match = await createMatchForUsers(
          { id: firstDbUser.id, elo: firstDbUser.elo },
          { id: secondDbUser.id, elo: secondDbUser.elo },
          modeToEnum(mode)
        );

        const startsAt = new Date().toISOString();

        sendToUser(firstDbUser.id, "match.found", {
          matchId: match.id,
          opponent: {
            userId: secondDbUser.id,
            username: secondDbUser.username,
            elo: secondDbUser.elo,
          },
          problemSummary: match.problem
            ? {
                id: match.problem.id,
                title: match.problem.title,
                difficulty: match.problem.difficulty,
                category: match.problem.category,
              }
            : null,
          startsAt,
        });

        sendToUser(secondDbUser.id, "match.found", {
          matchId: match.id,
          opponent: {
            userId: firstDbUser.id,
            username: firstDbUser.username,
            elo: firstDbUser.elo,
          },
          problemSummary: match.problem
            ? {
                id: match.problem.id,
                title: match.problem.title,
                difficulty: match.problem.difficulty,
                category: match.problem.category,
              }
            : null,
          startsAt,
        });

        startMatchTimer(match.id, [firstDbUser.id, secondDbUser.id]);
      }

      return;
    }

    if (event.event === "queue.leave") {
      const result = globalMatchQueue.leave(context.userId);
      sendWsEvent(socket, "queue.state", {
        mode: result.mode,
        position: null,
        queued: false,
      });
      return;
    }

    if (event.event === "chat.send") {
      if (!isObject(event.payload)) {
        sendWsEvent(socket, "error", {
          code: "VALIDATION_ERROR",
          message: "payload object is required.",
        });
        return;
      }

      const toUsername = getTrimmedString(event.payload.toUsername);
      const content = getTrimmedString(event.payload.content);

      if (!toUsername || !content) {
        sendWsEvent(socket, "error", {
          code: "VALIDATION_ERROR",
          message: "toUsername and content are required.",
        });
        return;
      }

      const toUser = await getUserByUsername(toUsername);
      if (!toUser) {
        sendWsEvent(socket, "error", {
          code: "NOT_FOUND",
          message: "target user not found.",
        });
        return;
      }

      const toUserId = toUser.id;
      const message = await sendMessage(context.userId, toUserId, content);

      sendToUser(toUserId, "chat.received", {
        fromUserId: context.userId,
        messageId: message.id,
        content: message.content,
        createdAt: message.createdAt,
      });

      sendWsEvent(socket, "chat.received", {
        fromUserId: context.userId,
        messageId: message.id,
        content: message.content,
        createdAt: message.createdAt,
      });

      return;
    }

    if (event.event === "challenge.send") {
      if (!isObject(event.payload)) {
        sendWsEvent(socket, "error", {
          code: "VALIDATION_ERROR",
          message: "payload object is required.",
        });
        return;
      }

      const toUsername = getTrimmedString(event.payload.toUsername);
      if (!toUsername) {
        sendWsEvent(socket, "error", {
          code: "VALIDATION_ERROR",
          message: "toUsername is required.",
        });
        return;
      }

      const toUser = await getUserByUsername(toUsername);
      if (!toUser) {
        sendWsEvent(socket, "error", {
          code: "NOT_FOUND",
          message: "target user not found.",
        });
        return;
      }

      const toUserId = toUser.id;
      const challenge = await createChallenge(context.userId, toUserId);
      sendToUser(toUserId, "challenge.received", {
        fromUserId: context.userId,
        messageId: challenge.id,
        createdAt: challenge.createdAt,
      });

      sendWsEvent(socket, "challenge.sent", {
        toUserId,
        messageId: challenge.id,
        createdAt: challenge.createdAt,
      });
      return;
    }

    // ---- Match cancel vote flow ----

    if (event.event === "match.cancel.request") {
      const matchId = getTrimmedString(isObject(event.payload) ? event.payload.matchId : "");
      if (!matchId) {
        sendWsEvent(socket, "error", { code: "VALIDATION_ERROR", message: "matchId is required." });
        return;
      }

      const match = await getMatchById(matchId);
      if (!match || match.status !== "ACTIVE") {
        sendWsEvent(socket, "error", { code: "NOT_FOUND", message: "Active match not found." });
        return;
      }

      const me = match.participants.find((p) => p.userId === context.userId);
      const opponent = match.participants.find((p) => p.userId !== context.userId);
      if (!me || !opponent) {
        sendWsEvent(socket, "error", { code: "NOT_FOUND", message: "Participant not found." });
        return;
      }

      // Don't allow duplicate requests
      if (pendingCancelVotes.has(matchId)) {
        sendWsEvent(socket, "error", { code: "CONFLICT", message: "Cancel vote already pending." });
        return;
      }

      pendingCancelVotes.set(matchId, context.userId);

      // Tell the requester we're waiting
      sendToUser(context.userId, "match.cancel.waiting", { matchId });

      // Ask the opponent to vote
      sendToUser(opponent.userId, "match.cancel.proposed", {
        matchId,
        requestedBy: context.username,
      });

      return;
    }

    if (event.event === "match.cancel.accept") {
      const matchId = getTrimmedString(isObject(event.payload) ? event.payload.matchId : "");
      if (!matchId) {
        sendWsEvent(socket, "error", { code: "VALIDATION_ERROR", message: "matchId is required." });
        return;
      }

      const requesterId = pendingCancelVotes.get(matchId);
      if (!requesterId) {
        sendWsEvent(socket, "error", { code: "NOT_FOUND", message: "No pending cancel vote." });
        return;
      }

      // Only the non-requester can accept
      if (requesterId === context.userId) {
        sendWsEvent(socket, "error", { code: "FORBIDDEN", message: "You cannot accept your own cancel request." });
        return;
      }

      pendingCancelVotes.delete(matchId);

      // Stop the match timer
      const timer = activeMatchTimers.get(matchId);
      if (timer) {
        clearInterval(timer.interval);
        activeMatchTimers.delete(matchId);
      }

      // Cancel the match in DB
      await cancelMatch(matchId);

      // Notify both players
      const match = await getMatchById(matchId);
      if (match) {
        for (const p of match.participants) {
          sendToUser(p.userId, "match.cancelled", { matchId, reason: "mutual_agreement" });
        }
      }

      return;
    }

    if (event.event === "match.cancel.decline") {
      const matchId = getTrimmedString(isObject(event.payload) ? event.payload.matchId : "");
      if (!matchId) {
        sendWsEvent(socket, "error", { code: "VALIDATION_ERROR", message: "matchId is required." });
        return;
      }

      const requesterId = pendingCancelVotes.get(matchId);
      if (!requesterId) {
        sendWsEvent(socket, "error", { code: "NOT_FOUND", message: "No pending cancel vote." });
        return;
      }

      pendingCancelVotes.delete(matchId);

      // Tell the requester their cancel was declined
      sendToUser(requesterId, "match.cancel.rejected", { matchId });

      return;
    }

    if (event.event === "submission.create") {
      if (!isObject(event.payload)) {
        sendWsEvent(socket, "error", {
          code: "VALIDATION_ERROR",
          message: "payload object is required.",
        });
        return;
      }

      const matchId = getTrimmedString(event.payload.matchId);
      const language = getTrimmedString(event.payload.language);
      const code = typeof event.payload.code === "string" ? event.payload.code : "";

      if (!matchId || !language || !code.trim()) {
        sendWsEvent(socket, "error", {
          code: "VALIDATION_ERROR",
          message: "matchId, language, and code are required.",
        });
        return;
      }

      // Look up the match to get the problemId
      const match = await getMatchById(matchId);
      if (!match || !match.problemId) {
        sendWsEvent(socket, "error", {
          code: "NOT_FOUND",
          message: "Match or problem not found.",
        });
        return;
      }

      const submission = await createSubmission(matchId, context.userId, language, code);

      sendWsEvent(socket, "submission.accepted", {
        submissionId: submission.id,
        matchId,
        status: submission.status,
      });

      // Enqueue for real execution instead of simulating
      await enqueueSubmission({
        submissionId: submission.id,
        matchId,
        userId: context.userId,
        problemId: match.problemId,
        language,
        code,
      });

      return;
    }

    sendWsEvent(socket, "error", {
      code: "NOT_FOUND",
      message: `Unsupported event: ${event.event}`,
    });
  }

  function bindSocket(socket: LiveWebSocket, context: WsAuthContext): void {
    let userSockets = socketsByUserId.get(context.userId);
    if (!userSockets) {
      userSockets = new Set();
      socketsByUserId.set(context.userId, userSockets);
    }
    userSockets.add(socket);
    userIdBySocket.set(socket, context);

    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.on("message", async (rawMessage) => {
      try {
        const parsed = JSON.parse(rawMessage.toString()) as WsEvent;
        if (!parsed || typeof parsed.event !== "string") {
          sendWsEvent(socket, "error", {
            code: "VALIDATION_ERROR",
            message: "Invalid WS event payload.",
          });
          return;
        }
        await handleWsEvent(socket, parsed);
      } catch (error) {
        const mapped = mapKnownError(error);
        sendWsEvent(socket, "error", {
          code: mapped.code,
          message: mapped.message,
        });
      }
    });

    socket.on("close", () => {
      removeSocket(socket);
    });

    socket.on("error", () => {
      removeSocket(socket);
    });

    sendWsEvent(socket, "auth.ready", {
      userId: context.userId,
      username: context.username,
    });
  }

  const handleUpgrade = (request: IncomingMessage, socket: Socket, head: Buffer) => {
    const socketWithWrite = socket;

    const rejectUpgrade = (statusCode: number, statusText: string) => {
      socketWithWrite.write(`HTTP/1.1 ${statusCode} ${statusText}\r\nConnection: close\r\n\r\n`);
      socketWithWrite.destroy();
    };

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(request.url ?? "/", "http://localhost");
    } catch (_error) {
      rejectUpgrade(400, "Bad Request");
      return;
    }

    if (parsedUrl.pathname !== "/ws") {
      rejectUpgrade(404, "Not Found");
      return;
    }

    const tokenFromQuery = getTrimmedString(parsedUrl.searchParams.get("token"));
    const tokenFromHeader = (() => {
      const auth = request.headers.authorization;
      if (!auth) {
        return "";
      }

      const parts = auth.split(" ");
      if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
        return "";
      }
      return parts[1].trim();
    })();

    const token = tokenFromQuery || tokenFromHeader;
    if (!token) {
      rejectUpgrade(401, "Unauthorized");
      return;
    }

    void (async () => {
      const session = await getSessionByToken(token);
      if (!session) {
        rejectUpgrade(401, "Unauthorized");
        return;
      }

      wsServer.handleUpgrade(request, socket, head, (websocket) => {
        const ws = websocket as LiveWebSocket;
        bindSocket(ws, {
          userId: session.user.id,
          username: session.user.username,
        });
      });
    })().catch((_error) => {
      rejectUpgrade(500, "Internal Server Error");
    });
  };

  wsServer.on("connection", () => {
    // no-op: connection lifecycle is managed in bindSocket.
  });

  const wsHeartbeatInterval = setInterval(() => {
    for (const socket of wsServer.clients) {
      const liveSocket = socket as LiveWebSocket;

      if (!liveSocket.isAlive) {
        liveSocket.terminate();
        continue;
      }

      liveSocket.isAlive = false;
      liveSocket.ping();
    }
  }, 20_000);

  wsServer.on("close", () => {
    clearInterval(wsHeartbeatInterval);
  });

  return {
    wsServer,
    sendToUser,
    handleUpgrade,
    getClientCount: () => wsServer.clients.size,
    endMatchEarly: async (matchId: string, reason: string) => {
      // Stop the timer if running
      const timer = activeMatchTimers.get(matchId);
      if (timer) {
        clearInterval(timer.interval);
        activeMatchTimers.delete(matchId);
      }
      await finalizeMatch(matchId, reason);
    },
  };
}
