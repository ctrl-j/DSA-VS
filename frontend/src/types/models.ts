export interface Profile {
  userId?: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

export interface User {
  id: string;
  username: string;
  elo: number;
  isAdmin?: boolean;
  isBanned?: boolean;
  profile?: Profile | null;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  receiverId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
}

export interface PublicUser {
  id: string;
  username: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

export interface QueueState {
  mode: "ranked" | "ffa" | null;
  queued: boolean;
  position?: number;
}

export interface UserReportInput {
  reportedUsername: string;
  reason: string;
}

export interface BugReportInput {
  title: string;
  description: string;
}

export interface AdminChatMessage extends ChatMessage {
  sender: PublicUser;
  receiver: PublicUser;
}

export interface AdminUserReport {
  id: string;
  reason: string;
  status: "OPEN" | "CLOSED";
  reported: PublicUser;
  reporter: PublicUser;
}

export interface BugReport {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}
