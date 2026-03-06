import { apiRequest } from "../../services/api/client";
import { PublicUser } from "../../types/models";

export function getBlocked(token: string) {
  return apiRequest<PublicUser[]>("/api/blocks", { token });
}

export function blockUser(token: string, blockedUsername: string) {
  return apiRequest<{ blockerId: string; blockedId: string }>("/api/blocks", {
    method: "POST",
    token,
    body: { blockedUsername },
  });
}

export function unblockUser(token: string, identifier: string) {
  return apiRequest<{ unblocked: boolean }>(`/api/blocks/${encodeURIComponent(identifier)}`, {
    method: "DELETE",
    token,
  });
}
