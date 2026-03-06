export interface SafeUser {
  id: string;
  username: string;
  elo: number;
  isAdmin: boolean;
  isBanned: boolean;
}

export interface AuthenticatedSession {
  sessionId: string;
  userId: string;
  expiresAt: Date;
  user: SafeUser;
}

export interface PublicUserSummary {
  id: string;
  username: string;
}

export function toSafeUser(user: {
  id: string;
  username: string;
  elo: number;
  isAdmin: boolean;
  isBanned: boolean;
}): SafeUser {
  return {
    id: user.id,
    username: user.username,
    elo: user.elo,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
  };
}
