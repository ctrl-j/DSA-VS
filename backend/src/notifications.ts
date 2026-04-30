export type NotificationType =
  | "chat_message"
  | "friend_online"
  | "friend_offline"
  | "challenge_received";

export interface Notification {
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export function buildChatNotification(
  fromUsername: string,
  content: string,
  messageId: string
): Notification {
  const preview = content.length > 50 ? content.slice(0, 50) + "..." : content;
  return {
    type: "chat_message",
    title: "New Message",
    body: `${fromUsername}: ${preview}`,
    data: { fromUsername, messageId },
    timestamp: new Date().toISOString(),
  };
}

export function buildFriendOnlineNotification(
  friendUsername: string,
  friendUserId: string
): Notification {
  return {
    type: "friend_online",
    title: "Friend Online",
    body: `${friendUsername} is now online`,
    data: { friendUserId, friendUsername },
    timestamp: new Date().toISOString(),
  };
}

export function buildFriendOfflineNotification(
  friendUsername: string,
  friendUserId: string
): Notification {
  return {
    type: "friend_offline",
    title: "Friend Offline",
    body: `${friendUsername} went offline`,
    data: { friendUserId, friendUsername },
    timestamp: new Date().toISOString(),
  };
}

export function buildChallengeNotification(
  fromUsername: string,
  fromUserId: string,
  messageId: string
): Notification {
  return {
    type: "challenge_received",
    title: "Challenge Received",
    body: `${fromUsername} has challenged you to a match!`,
    data: { fromUserId, fromUsername, messageId },
    timestamp: new Date().toISOString(),
  };
}
