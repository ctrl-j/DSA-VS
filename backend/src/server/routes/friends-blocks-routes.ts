import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import {
  acceptFriendRequest,
  addFriend,
  blockUser,
  declineFriendRequest,
  getBlockedUsers,
  getPendingFriendRequests,
  getUserById,
  getUserByUsername,
  getFriends,
  removeFriend,
  unblockUser,
  type SafeUser,
} from "../../database";
import { getTrimmedString, readJsonBody, sendSuccess } from "../http-utils";
import { ApiException } from "../types";

export async function handleFriendsBlocksRoutes(
  method: string | undefined,
  url: URL,
  res: ServerResponse,
  currentUser: SafeUser,
  req: IncomingMessage
): Promise<boolean> {
  if (method === "POST" && url.pathname === "/api/friends/requests") {
    const body = await readJsonBody(req);
    const receiverUsername = getTrimmedString(body.receiverUsername);

    if (!receiverUsername) {
      throw new ApiException(400, "VALIDATION_ERROR", "receiverUsername is required.");
    }

    const receiver = await getUserByUsername(receiverUsername);
    if (!receiver) {
      throw new ApiException(404, "NOT_FOUND", "receiverUsername not found.");
    }

    const receiverId = receiver.id;
    const request = await addFriend(currentUser.id, receiverId);
    sendSuccess(res, 200, request);
    return true;
  }

  if (method === "POST" && /^\/api\/friends\/requests\/[^/]+\/accept$/.test(url.pathname)) {
    const segments = url.pathname.split("/");
    const requestId = segments[4] || "";
    const request = await acceptFriendRequest(requestId, currentUser.id);
    sendSuccess(res, 200, request);
    return true;
  }

  if (method === "POST" && /^\/api\/friends\/requests\/[^/]+\/decline$/.test(url.pathname)) {
    const segments = url.pathname.split("/");
    const requestId = segments[4] || "";
    const request = await declineFriendRequest(requestId, currentUser.id);
    sendSuccess(res, 200, request);
    return true;
  }

  if (method === "GET" && url.pathname === "/api/friends/requests/pending") {
    const pending = await getPendingFriendRequests(currentUser.id);
    sendSuccess(res, 200, pending);
    return true;
  }

  if (method === "GET" && url.pathname === "/api/friends") {
    const friends = await getBlockedUsers(currentUser.id);
    const actualFriends = await getFriends(currentUser.id);
    sendSuccess(res, 200, {
      friends: actualFriends,
      blocked: friends,
    });
    return true;
  }

  if (method === "DELETE" && /^\/api\/friends\/[^/]+$/.test(url.pathname)) {
    const friendIdentifier = decodeURIComponent(url.pathname.split("/")[3] || "").trim();
    if (!friendIdentifier) {
      throw new ApiException(400, "VALIDATION_ERROR", "friend username is required.");
    }

    const friend = await getUserByUsername(friendIdentifier);
    if (!friend) {
      throw new ApiException(404, "NOT_FOUND", "friend user not found.");
    }

    const friendId = friend.id;
    await removeFriend(currentUser.id, friendId);
    sendSuccess(res, 200, { removed: true, friendId, friendIdentifier });
    return true;
  }

  if (method === "POST" && url.pathname === "/api/blocks") {
    const body = await readJsonBody(req);
    let blockedId = getTrimmedString(body.blockedId);
    const blockedUsername = getTrimmedString(body.blockedUsername);

    if (!blockedId && !blockedUsername) {
      throw new ApiException(400, "VALIDATION_ERROR", "blockedId or blockedUsername is required.");
    }

    if (!blockedId && blockedUsername) {
      const user = await getUserByUsername(blockedUsername);
      if (!user) {
        throw new ApiException(404, "NOT_FOUND", "blockedUsername not found.");
      }
      blockedId = user.id;
    }

    const block = await blockUser(currentUser.id, blockedId);
    sendSuccess(res, 200, block);
    return true;
  }

  if (method === "DELETE" && /^\/api\/blocks\/[^/]+$/.test(url.pathname)) {
    const blockedIdentifier = decodeURIComponent(url.pathname.split("/")[3] || "").trim();
    if (!blockedIdentifier) {
      throw new ApiException(400, "VALIDATION_ERROR", "blockedId or blockedUsername is required.");
    }

    let blockedId = blockedIdentifier;
    const idLookup = await getUserById(blockedIdentifier);
    if (!idLookup) {
      const user = await getUserByUsername(blockedIdentifier);
      if (!user) {
        throw new ApiException(404, "NOT_FOUND", "blocked user not found.");
      }
      blockedId = user.id;
    }

    await unblockUser(currentUser.id, blockedId);
    sendSuccess(res, 200, { unblocked: true, blockedId, blockedIdentifier });
    return true;
  }

  if (method === "GET" && url.pathname === "/api/blocks") {
    const blocks = await getBlockedUsers(currentUser.id);
    sendSuccess(res, 200, blocks);
    return true;
  }

  return false;
}
