import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import {
  createChallenge,
  getChatHistory,
  getUserByUsername,
  sendMessage,
  type SafeUser,
} from "../../database";
import { getTrimmedString, parsePositiveInt, readJsonBody, sendSuccess } from "../http-utils";
import { ApiException } from "../types";

export async function handleChatChallengeRoutes(
  method: string | undefined,
  url: URL,
  res: ServerResponse,
  currentUser: SafeUser,
  req: IncomingMessage,
  sendToUser: (userId: string, event: string, payload: unknown) => void
): Promise<boolean> {
  if (method === "POST" && /^\/api\/chats\/[^/]+\/messages$/.test(url.pathname)) {
    const targetUsername = decodeURIComponent(url.pathname.split("/")[3] || "").trim();
    const body = await readJsonBody(req);
    const content = getTrimmedString(body.content).slice(0, 4000);

    if (!targetUsername || !content) {
      throw new ApiException(400, "VALIDATION_ERROR", "target user and content are required.");
    }

    const targetUser = await getUserByUsername(targetUsername);
    if (!targetUser) {
      throw new ApiException(404, "NOT_FOUND", "target user not found.");
    }

    const targetUserId = targetUser.id;
    const message = await sendMessage(currentUser.id, targetUserId, content);
    sendSuccess(res, 201, message);

    sendToUser(targetUserId, "chat.received", {
      fromUserId: currentUser.id,
      messageId: message.id,
      content: message.content,
      createdAt: message.createdAt,
    });
    return true;
  }

  if (method === "GET" && /^\/api\/chats\/[^/]+\/messages$/.test(url.pathname)) {
    const targetUsername = decodeURIComponent(url.pathname.split("/")[3] || "").trim();
    const limit = parsePositiveInt(url.searchParams.get("limit"), 50, 1, 200);
    const offset = parsePositiveInt(url.searchParams.get("offset"), 0, 0, 10000);

    if (!targetUsername) {
      throw new ApiException(400, "VALIDATION_ERROR", "target username is required.");
    }

    const targetUser = await getUserByUsername(targetUsername);
    if (!targetUser) {
      throw new ApiException(404, "NOT_FOUND", "target user not found.");
    }

    const targetUserId = targetUser.id;
    const history = await getChatHistory(currentUser.id, targetUserId, limit, offset);
    sendSuccess(res, 200, history);
    return true;
  }

  if (method === "POST" && url.pathname === "/api/challenges") {
    const body = await readJsonBody(req);
    const receiverUsername = getTrimmedString(body.receiverUsername);
    if (!receiverUsername) {
      throw new ApiException(400, "VALIDATION_ERROR", "receiverUsername is required.");
    }

    const receiver = await getUserByUsername(receiverUsername);
    if (!receiver) {
      throw new ApiException(404, "NOT_FOUND", "receiver user not found.");
    }

    const receiverId = receiver.id;
    const challenge = await createChallenge(currentUser.id, receiverId);
    sendSuccess(res, 201, challenge);

    sendToUser(receiverId, "challenge.received", {
      fromUserId: currentUser.id,
      messageId: challenge.id,
      createdAt: challenge.createdAt,
    });
    return true;
  }

  return false;
}
