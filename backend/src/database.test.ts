import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { FriendRequestStatus, MessageType, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { mockDeep, mockReset } from "jest-mock-extended";

const prismaMock = mockDeep<PrismaClient>();

jest.mock("@prisma/client", () => {
  const actual = jest.requireActual("@prisma/client") as Record<string, unknown>;
  return {
    ...actual,
    PrismaClient: jest.fn().mockImplementation(() => prismaMock),
  };
});

import * as db from "./database";

describe("Database Layer", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  describe("Registration", () => {
    it("registers a new user", async () => {
      (prismaMock.user.findUnique as any).mockResolvedValue(null);
      (prismaMock.user.create as any).mockResolvedValue({
        id: "u1",
        username: "new_user",
        elo: 1200,
        isAdmin: false,
        isBanned: false,
      });

      const user = await db.registerUser("new_user", "mysecurepassword");
      expect(user.username).toBe("new_user");
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it("rejects duplicate username", async () => {
      (prismaMock.user.findUnique as any).mockResolvedValue({ id: "existing" });

      await expect(db.registerUser("existing", "password123")).rejects.toThrow(
        "USERNAME_ALREADY_EXISTS"
      );
    });
  });

  describe("Authentication", () => {
    it("returns user id for valid password", async () => {
      const hash = await bcrypt.hash("correct-pass", 1);
      (prismaMock.user.findUnique as any).mockResolvedValue({ id: "u1", passwordHash: hash });

      const userId = await db.checkUserPassword("user", "correct-pass");
      expect(userId).toBe("u1");
    });

    it("returns null for invalid password", async () => {
      const hash = await bcrypt.hash("correct-pass", 1);
      (prismaMock.user.findUnique as any).mockResolvedValue({ id: "u1", passwordHash: hash });

      const userId = await db.checkUserPassword("user", "bad-pass");
      expect(userId).toBeNull();
    });
  });

  describe("Session Management", () => {
    it("creates and refreshes a valid session", async () => {
      (prismaMock.session.create as any).mockResolvedValue({ id: "s1" });

      const createResult = await db.createSessionForUser("u1");
      expect(createResult.token).toBeTruthy();
      expect(prismaMock.session.create).toHaveBeenCalled();

      const now = new Date();
      const future = new Date(now.getTime() + 5 * 60_000);
      (prismaMock.session.findUnique as any).mockResolvedValue({
        id: "s1",
        userId: "u1",
        expiresAt: future,
        user: {
          id: "u1",
          username: "alice",
          elo: 1200,
          isAdmin: false,
          isBanned: false,
        },
      });
      (prismaMock.session.update as any).mockResolvedValue({ id: "s1" });

      const refreshed = await db.getSessionByToken(createResult.token);
      expect(refreshed?.userId).toBe("u1");
      expect(prismaMock.session.update).toHaveBeenCalled();
    });

    it("deletes expired sessions", async () => {
      const past = new Date(Date.now() - 60_000);
      (prismaMock.session.findUnique as any).mockResolvedValue({
        id: "s1",
        userId: "u1",
        expiresAt: past,
        user: {
          id: "u1",
          username: "alice",
          elo: 1200,
          isAdmin: false,
          isBanned: false,
        },
      });
      (prismaMock.session.delete as any).mockResolvedValue({ id: "s1" });

      const result = await db.getSessionByToken("token");
      expect(result).toBeNull();
      expect(prismaMock.session.delete).toHaveBeenCalled();
    });
  });

  describe("Password Changes", () => {
    it("rejects wrong current password", async () => {
      const hash = await bcrypt.hash("old-pass", 1);
      (prismaMock.user.findUnique as any).mockResolvedValue({ passwordHash: hash });

      await expect(db.changeUserPassword("u1", "wrong-old", "new-pass-123")).rejects.toThrow(
        "INVALID_OLD_PASSWORD"
      );
    });
  });

  describe("Friend Requests", () => {
    it("creates PENDING friend request", async () => {
      (prismaMock.friendRequest.findUnique as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (prismaMock.friendRequest.create as any).mockResolvedValue({
        id: "fr1",
        status: FriendRequestStatus.PENDING,
      });

      const result = await db.addFriend("u1", "u2");
      expect(result.status).toBe(FriendRequestStatus.PENDING);
      expect(prismaMock.friendRequest.create).toHaveBeenCalled();
    });

    it("auto-accepts reverse pending request", async () => {
      (prismaMock.friendRequest.findUnique as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: "fr2",
          requesterId: "u2",
          receiverId: "u1",
          status: FriendRequestStatus.PENDING,
        });
      (prismaMock.friendRequest.update as any).mockResolvedValue({
        id: "fr2",
        status: FriendRequestStatus.ACCEPTED,
      });

      const result = await db.addFriend("u1", "u2");
      expect(result.status).toBe(FriendRequestStatus.ACCEPTED);
    });
  });

  describe("Blocks and Messaging", () => {
    it("prevents message when either side has block", async () => {
      (prismaMock.block.findFirst as any).mockResolvedValue({ blockerId: "u2" });

      await expect(db.sendMessage("u1", "u2", "hello")).rejects.toThrow(
        "CANNOT_SEND_MESSAGE_BLOCKED"
      );
    });

    it("creates challenge messages as CHALLENGE type", async () => {
      (prismaMock.block.findFirst as any).mockResolvedValue(null);
      (prismaMock.message.create as any).mockResolvedValue({
        id: "m1",
        type: MessageType.CHALLENGE,
      });

      const result = await db.createChallenge("u1", "u2");
      expect(result.type).toBe(MessageType.CHALLENGE);
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: MessageType.CHALLENGE }),
        })
      );
    });
  });

  describe("Admin and Reports", () => {
    it("returns admin chat logs", async () => {
      (prismaMock.message.findMany as any).mockResolvedValue([{ id: "m1", content: "hello" }]);
      const result = await db.getChatsBetweenUsers("u1", "u2");
      expect(result).toHaveLength(1);
    });

    it("creates bug reports", async () => {
      (prismaMock.bugReport.create as any).mockResolvedValue({ id: "b1" });
      const result = await db.createBugReport("u1", "title", "description");
      expect(result.id).toBe("b1");
    });
  });
});
