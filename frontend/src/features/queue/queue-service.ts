import { apiRequest } from "../../services/api/client";
import { QueueState } from "../../types/models";

export interface QueuePairUser {
  userId: string;
  username: string;
  elo: number;
}

export interface QueueJoinResult {
  joined: boolean;
  mode: "ranked" | "ffa";
  position: number | null;
  duplicate: boolean;
  pair: {
    mode: "ranked";
    users: [QueuePairUser, QueuePairUser];
    matchedAtMs: number;
  } | null;
}

export function joinQueue(username: string, mode: "ranked" | "ffa") {
  return apiRequest<QueueJoinResult>("/api/queue/join", {
    method: "POST",
    body: { username, mode },
  });
}

export function leaveQueue(username: string) {
  return apiRequest<{ removed: boolean }>("/api/queue/leave", {
    method: "POST",
    body: { username },
  });
}

export function queueState(username: string) {
  return apiRequest<QueueState>("/api/queue/state", {
    query: { username },
  });
}
