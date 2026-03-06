import { apiRequest } from "../../services/api/client";
import { ChatMessage } from "../../types/models";

export function getConversation(token: string, targetUsername: string) {
  return apiRequest<ChatMessage[]>(`/api/chats/${encodeURIComponent(targetUsername)}/messages`, {
    token,
  });
}

export function sendMessageToUser(token: string, targetUsername: string, content: string) {
  return apiRequest<ChatMessage>(`/api/chats/${encodeURIComponent(targetUsername)}/messages`, {
    method: "POST",
    token,
    body: { content },
  });
}

export function challengeUser(token: string, receiverUsername: string) {
  return apiRequest<{ id: string }>("/api/challenges", {
    method: "POST",
    token,
    body: { receiverUsername },
  });
}
