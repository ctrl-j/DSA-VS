export interface UserArgs {
  userId: string;
  username: string;
  elo?: number;
  authenticated?: boolean;
}

export interface UserPayload {
  id?: unknown;
  userId?: unknown;
  username?: unknown;
  elo?: unknown;
  authenticated?: unknown;
}

export class User {
  userId: string;
  username: string;
  elo: number;
  authenticated: boolean;

  constructor({ userId, username, elo, authenticated }: UserArgs) {
    this.userId = userId;
    this.username = username;

    if (typeof elo === "number") {
      this.elo = elo;
    } else {
      this.elo = 1000;
    }

    if (typeof authenticated === "boolean") {
      this.authenticated = authenticated;
    } else {
      this.authenticated = false;
    }
  }

  static fromPayload(payload: UserPayload | null | undefined): User {
    if (!payload || typeof payload !== "object") {
      throw new Error("User payload is required.");
    }

    let rawId: unknown;
    if (payload.userId !== undefined && payload.userId !== null) {
      rawId = payload.userId;
    } else {
      rawId = payload.id;
    }

    let userId: string;
    if (typeof rawId === "string") {
      userId = rawId.trim();
    } else {
      userId = "";
    }

    if (!userId) {
      throw new Error("userId is required.");
    }

    let username: string;
    if (typeof payload.username === "string") {
      const trimmedUsername = payload.username.trim();
      if (trimmedUsername) {
        username = trimmedUsername;
      } else {
        username = userId;
      }
    } else {
      username = userId;
    }

    const parsedElo = Number(payload.elo);
    let elo: number;
    if (Number.isFinite(parsedElo)) {
      const flooredElo = Math.floor(parsedElo);
      if (flooredElo < 0) {
        elo = 0;
      } else {
        elo = flooredElo;
      }
    } else {
      elo = 1000;
    }

    let authenticated: boolean;
    if (payload.authenticated) {
      authenticated = true;
    } else {
      authenticated = false;
    }

    return new User({
      userId,
      username,
      elo,
      authenticated,
    });
  }
}
