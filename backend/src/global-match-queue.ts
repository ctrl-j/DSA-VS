import { User } from "./user";

interface QueueEntry {
  user: User;
  joinedAtMs: number;
  preferences?: {
    difficulty?: string;
    category?: string;
  };
}

interface QueueState {
  ranked: QueueEntry[];
  ffa: QueueEntry[];
}

interface QueueSnapshotEntry {
  userId: string;
  username: string;
  elo: number;
}

interface RankedPair {
  mode: "ranked";
  users: [User, User];
  matchedAtMs: number;
  preferences?: {
    difficulty?: string;
    category?: string;
  };
}

interface JoinResult {
  joined: boolean;
  mode: "ranked" | "ffa";
  position: number | null;
  duplicate: boolean;
  pair: RankedPair | null;
}

interface LeaveResult {
  removed: boolean;
  mode: "ranked" | "ffa" | null;
}

interface UserQueueState {
  queued: boolean;
  mode: "ranked" | "ffa" | null;
  position: number | null;
}

export class GlobalMatchQueue {
  private queues: QueueState;
  private memberships: Map<string, "ranked" | "ffa">;

  constructor() {
    this.queues = {
      ranked: [],
      ffa: [],
    };
    this.memberships = new Map();
  }

  join(
    user: User,
    mode: "ranked" | "ffa",
    preferences?: { difficulty?: string; category?: string }
  ): JoinResult {
    this.assertValidMode(mode);
    const existingMode = this.memberships.get(user.userId);

    if (existingMode && existingMode !== mode) {
      throw new Error(`User is already queued in ${existingMode}.`);
    }

    const queue = this.queues[mode];
    if (existingMode === mode) {
      return {
        joined: false,
        mode,
        position: this.findPosition(queue, user.userId),
        duplicate: true,
        pair: null,
      };
    }

    queue.push({
      user,
      joinedAtMs: Date.now(),
      preferences,
    });
    this.memberships.set(user.userId, mode);

    const pair = mode === "ranked" ? this.tryMakeRankedPair() : null;
    return {
      joined: true,
      mode,
      position: pair ? null : this.findPosition(queue, user.userId),
      duplicate: false,
      pair,
    };
  }

  leave(userId: string): LeaveResult {
    const mode = this.memberships.get(userId);
    if (!mode) {
      return { removed: false, mode: null };
    }

    const queue = this.queues[mode];
    const index = queue.findIndex((entry) => entry.user.userId === userId);
    if (index >= 0) {
      queue.splice(index, 1);
    }
    this.memberships.delete(userId);
    return {
      removed: true,
      mode,
    };
  }

  getUserQueueState(userId: string): UserQueueState {
    const mode = this.memberships.get(userId);
    if (!mode) {
      return {
        queued: false,
        mode: null,
        position: null,
      };
    }
    const position = this.findPosition(this.queues[mode], userId);
    return {
      queued: true,
      mode,
      position,
    };
  }

  snapshot(): { ranked: QueueSnapshotEntry[]; ffa: QueueSnapshotEntry[] } {
    return {
      ranked: this.queues.ranked.map((entry) => ({
        userId: entry.user.userId,
        username: entry.user.username,
        elo: entry.user.elo,
      })),
      ffa: this.queues.ffa.map((entry) => ({
        userId: entry.user.userId,
        username: entry.user.username,
        elo: entry.user.elo,
      })),
    };
  }

  private tryMakeRankedPair(): RankedPair | null {
    const ranked = this.queues.ranked;
    if (ranked.length < 2) {
      return null;
    }

    const anchor = ranked[0];
    const now = Date.now();
    const anchorWindow = this.expandingWindow(anchor.joinedAtMs, now);

    let matchIndex = -1;
    for (let i = 1; i < ranked.length; i += 1) {
      const candidate = ranked[i];
      const candidateWindow = this.expandingWindow(candidate.joinedAtMs, now);
      const eloDiff = Math.abs(anchor.user.elo - candidate.user.elo);
      if (eloDiff <= Math.min(anchorWindow, candidateWindow)) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex < 0) {
      return null;
    }

    const first = ranked.splice(0, 1)[0];
    const second = ranked.splice(matchIndex - 1, 1)[0];
    this.memberships.delete(first.user.userId);
    this.memberships.delete(second.user.userId);

    return {
      mode: "ranked",
      users: [first.user, second.user],
      matchedAtMs: now,
      preferences: first.preferences,
    };
  }

  private expandingWindow(joinedAtMs: number, nowMs: number): number {
    const waitMs = Math.max(0, nowMs - joinedAtMs);
    const waitSteps = Math.floor(waitMs / 10000);
    const window = 100 + waitSteps * 25;
    return Math.min(window, 400);
  }

  private findPosition(queue: QueueEntry[], userId: string): number | null {
    const index = queue.findIndex((entry) => entry.user.userId === userId);
    if (index >= 0) {
      return index + 1;
    }
    return null;
  }

  private assertValidMode(mode: string): void {
    if (mode !== "ranked" && mode !== "ffa") {
      throw new Error("mode must be either 'ranked' or 'ffa'.");
    }
  }
}
