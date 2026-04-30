import { describe, it, expect } from "@jest/globals";
import {
  buildChatNotification,
  buildFriendOnlineNotification,
  buildFriendOfflineNotification,
  buildChallengeNotification,
  type Notification,
} from "../notifications";

describe("Sprint 3 User Story 1 - Notifications", () => {
  // ---------------------------------------------------------------------------
  // AC1: Chat message notification popup
  // ---------------------------------------------------------------------------
  describe("AC1: Chat message notification", () => {
    it("produces a notification with type chat_message", () => {
      const n = buildChatNotification("alice", "Hey there!", "msg-1");
      expect(n.type).toBe("chat_message");
    });

    it("includes sender username and message preview in body", () => {
      const n = buildChatNotification("alice", "Hey there!", "msg-1");
      expect(n.body).toContain("alice");
      expect(n.body).toContain("Hey there!");
    });

    it("truncates long messages to 50 chars with ellipsis", () => {
      const longMessage = "a".repeat(100);
      const n = buildChatNotification("bob", longMessage, "msg-2");
      // body = "bob: " + first 50 chars + "..."
      expect(n.body).toContain("...");
      expect(n.body.length).toBeLessThanOrEqual(60);
    });

    it("does not truncate short messages", () => {
      const n = buildChatNotification("bob", "short", "msg-3");
      expect(n.body).not.toContain("...");
      expect(n.body).toContain("short");
    });

    it("includes messageId in data for navigation", () => {
      const n = buildChatNotification("alice", "hi", "msg-42");
      expect(n.data.messageId).toBe("msg-42");
      expect(n.data.fromUsername).toBe("alice");
    });

    it("has a title suitable for popup display", () => {
      const n = buildChatNotification("alice", "hi", "msg-1");
      expect(n.title).toBe("New Message");
    });
  });

  // ---------------------------------------------------------------------------
  // AC2: Friend online notification
  // ---------------------------------------------------------------------------
  describe("AC2: Friend online/offline notification", () => {
    it("produces friend_online notification with correct type", () => {
      const n = buildFriendOnlineNotification("charlie", "user-123");
      expect(n.type).toBe("friend_online");
    });

    it("body tells the user which friend came online", () => {
      const n = buildFriendOnlineNotification("charlie", "user-123");
      expect(n.body).toContain("charlie");
      expect(n.body).toContain("online");
    });

    it("includes friend userId and username in data", () => {
      const n = buildFriendOnlineNotification("charlie", "user-123");
      expect(n.data.friendUserId).toBe("user-123");
      expect(n.data.friendUsername).toBe("charlie");
    });

    it("produces friend_offline notification when friend disconnects", () => {
      const n = buildFriendOfflineNotification("charlie", "user-123");
      expect(n.type).toBe("friend_offline");
      expect(n.body).toContain("charlie");
      expect(n.body).toContain("offline");
      expect(n.data.friendUserId).toBe("user-123");
    });
  });

  // ---------------------------------------------------------------------------
  // AC3: Challenge notification with navigation data
  // ---------------------------------------------------------------------------
  describe("AC3: Challenge notification", () => {
    it("produces challenge_received notification", () => {
      const n = buildChallengeNotification("dave", "user-456", "chal-1");
      expect(n.type).toBe("challenge_received");
    });

    it("body tells the user who challenged them", () => {
      const n = buildChallengeNotification("dave", "user-456", "chal-1");
      expect(n.body).toContain("dave");
      expect(n.body).toContain("challenged");
    });

    it("includes messageId so frontend can navigate to challenge acceptance screen", () => {
      const n = buildChallengeNotification("dave", "user-456", "chal-1");
      expect(n.data.messageId).toBe("chal-1");
    });

    it("includes fromUserId and fromUsername for challenge context", () => {
      const n = buildChallengeNotification("dave", "user-456", "chal-1");
      expect(n.data.fromUserId).toBe("user-456");
      expect(n.data.fromUsername).toBe("dave");
    });

    it("has a descriptive title", () => {
      const n = buildChallengeNotification("dave", "user-456", "chal-1");
      expect(n.title).toBe("Challenge Received");
    });
  });

  // ---------------------------------------------------------------------------
  // Common notification structure
  // ---------------------------------------------------------------------------
  describe("All notification types share a common structure", () => {
    const allNotifications: Notification[] = [
      buildChatNotification("user1", "hello", "m1"),
      buildFriendOnlineNotification("user2", "id2"),
      buildFriendOfflineNotification("user3", "id3"),
      buildChallengeNotification("user4", "id4", "m4"),
    ];

    it.each(allNotifications.map((n, i) => [n.type, n, i]))(
      "%s notification has type, title, body, data, and timestamp",
      (_type, notification) => {
        const n = notification as Notification;
        expect(typeof n.type).toBe("string");
        expect(typeof n.title).toBe("string");
        expect(typeof n.body).toBe("string");
        expect(typeof n.data).toBe("object");
        expect(n.data).not.toBeNull();
        expect(typeof n.timestamp).toBe("string");
      }
    );

    it("timestamps are valid ISO 8601 strings", () => {
      for (const n of allNotifications) {
        const parsed = new Date(n.timestamp);
        expect(parsed.toISOString()).toBe(n.timestamp);
      }
    });
  });
});
