import { createSeedUsers, MockUser } from "./seed";

export interface FriendRequestRecord {
  id: string;
  requester: string;
  receiver: string;
  status: "PENDING" | "ACCEPTED";
}

export interface MessageRecord {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  createdAt: string;
}

interface Report {
  id: string;
  reporterUsername: string;
  reportedUsername: string;
  reason: string;
  status: "OPEN" | "CLOSED";
  actionTaken?: string;
}

interface BugReport {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export class MockDb {
  users: MockUser[] = [];
  sessions = new Map<string, string>();
  requests: FriendRequestRecord[] = [];
  blocks = new Set<string>();
  messages: MessageRecord[] = [];
  queue = new Map<string, "ranked" | "ffa">();
  reports: Report[] = [];
  bugReports: BugReport[] = [];

  reset() {
    this.users = createSeedUsers();
    this.sessions.clear();
    this.requests = [];
    this.blocks.clear();
    this.messages = [
      {
        id: "m1",
        sender: "alice",
        receiver: "bob",
        content: "hello bob",
        createdAt: new Date().toISOString(),
      },
    ];
    this.queue.clear();
    this.reports = [];
    this.bugReports = [
      { id: "b1", title: "Sample bug", description: "sample", createdAt: new Date().toISOString() },
    ];
  }

  constructor() {
    this.reset();
  }

  user(username: string) {
    return this.users.find((u) => u.username === username);
  }

  userById(id: string) {
    return this.users.find((u) => u.id === id);
  }

  sessionUser(token: string | null) {
    if (!token) return null;
    const username = this.sessions.get(token);
    return username ? this.user(username) : null;
  }

  friendsOf(username: string) {
    return this.requests
      .filter((r) => r.status === "ACCEPTED" && (r.requester === username || r.receiver === username))
      .map((r) => (r.requester === username ? r.receiver : r.requester));
  }

  isBlocked(a: string, b: string) {
    return this.blocks.has(`${a}|${b}`) || this.blocks.has(`${b}|${a}`);
  }

  canLogin(user: MockUser) {
    return !user.isBanned;
  }
}

export const db = new MockDb();
