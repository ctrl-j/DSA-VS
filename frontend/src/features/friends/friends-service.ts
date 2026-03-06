import { apiRequest } from "../../services/api/client";
import { FriendRequest, PublicUser } from "../../types/models";

export interface FriendsPayload {
  friends: PublicUser[];
  blocked: PublicUser[];
}

export function getFriends(token: string) {
  return apiRequest<FriendsPayload>("/api/friends", { token });
}

export function sendFriendRequest(token: string, receiverUsername: string) {
  return apiRequest<FriendRequest>("/api/friends/requests", {
    method: "POST",
    token,
    body: { receiverUsername },
  });
}

export function acceptFriendRequest(token: string, requestId: string) {
  return apiRequest<FriendRequest>(`/api/friends/requests/${requestId}/accept`, {
    method: "POST",
    token,
  });
}

export interface IncomingFriendRequest {
  id: string;
  requesterId: string;
  receiverId: string;
  status: "PENDING";
  requester: PublicUser;
}

export function getPendingFriendRequests(token: string) {
  return apiRequest<IncomingFriendRequest[]>("/api/friends/requests/pending", { token });
}

export function declineFriendRequest(token: string, requestId: string) {
  return apiRequest<FriendRequest>(`/api/friends/requests/${requestId}/decline`, {
    method: "POST",
    token,
  });
}

export function removeFriend(token: string, username: string) {
  return apiRequest<{ removed: boolean }>(`/api/friends/${encodeURIComponent(username)}`, {
    method: "DELETE",
    token,
  });
}
