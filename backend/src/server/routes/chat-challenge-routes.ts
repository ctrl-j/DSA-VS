import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import {
  createChallenge,
  getChatHistory,
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
    const targetUserId = url.pathname.split("/")[3] || "";
    const body = await readJsonBody(req);
    const content = getTrimmedString(body.content).slice(0, 4000);

    if (!targetUserId || !content) {
      throw new ApiException(400, "VALIDATION_ERROR", "target user and content are required.");
    }

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
    const targetUserId = url.pathname.split("/")[3] || "";
    const limit = parsePositiveInt(url.searchParams.get("limit"), 50, 1, 200);
    const offset = parsePositiveInt(url.searchParams.get("offset"), 0, 0, 10000);

    const history = await getChatHistory(currentUser.id, targetUserId, limit, offset);
    sendSuccess(res, 200, history);
    return true;
  }

  if (method === "POST" && url.pathname === "/api/challenges") {
    const body = await readJsonBody(req);
    const receiverId = getTrimmedString(body.receiverId);
    if (!receiverId) {
      throw new ApiException(400, "VALIDATION_ERROR", "receiverId is required.");
    }

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
