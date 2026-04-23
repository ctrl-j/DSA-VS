import { describe, it, expect } from "@jest/globals";
import { GlobalMatchQueue } from "../global-match-queue";
import { User } from "../user";

describe("Story 3 - Opponent Progress (Queue Pairing)", () => {
  it("pairs two users who join ranked queue", () => {
    const queue = new GlobalMatchQueue();
    const user1 = new User({ userId: "u1", username: "alice", elo: 1200 });
    const user2 = new User({ userId: "u2", username: "bob", elo: 1200 });

    const result1 = queue.join(user1, "ranked");
    expect(result1.joined).toBe(true);
    expect(result1.pair).toBeNull();

    const result2 = queue.join(user2, "ranked");
    expect(result2.joined).toBe(true);
    expect(result2.pair).not.toBeNull();
    expect(result2.pair!.users).toHaveLength(2);

    const userIds = result2.pair!.users.map((u) => u.userId);
    expect(userIds).toContain("u1");
    expect(userIds).toContain("u2");
  });

  it("removes both users from queue after pairing", () => {
    const queue = new GlobalMatchQueue();
    const user1 = new User({ userId: "u1", username: "alice", elo: 1200 });
    const user2 = new User({ userId: "u2", username: "bob", elo: 1200 });

    queue.join(user1, "ranked");
    queue.join(user2, "ranked");

    const state1 = queue.getUserQueueState("u1");
    const state2 = queue.getUserQueueState("u2");
    expect(state1.queued).toBe(false);
    expect(state2.queued).toBe(false);
  });

  it("pair contains both users' info (username and elo)", () => {
    const queue = new GlobalMatchQueue();
    const user1 = new User({ userId: "u1", username: "alice", elo: 1100 });
    const user2 = new User({ userId: "u2", username: "bob", elo: 1150 });

    queue.join(user1, "ranked");
    const result = queue.join(user2, "ranked");

    const pair = result.pair!;
    const alice = pair.users.find((u) => u.userId === "u1")!;
    const bob = pair.users.find((u) => u.userId === "u2")!;
    expect(alice.username).toBe("alice");
    expect(alice.elo).toBe(1100);
    expect(bob.username).toBe("bob");
    expect(bob.elo).toBe(1150);
  });
});
