import { describe, it, expect, beforeEach, jest, afterAll } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mock bcrypt before any imports that use it
// ---------------------------------------------------------------------------
const mockBcrypt = {
  hash: jest.fn<any>(),
  compare: jest.fn<any>(),
};
jest.mock("bcrypt", () => mockBcrypt);

// ---------------------------------------------------------------------------
// Mock Prisma client before any imports that use it
// ---------------------------------------------------------------------------
const mockPrisma = {
  match: {
    create: jest.fn<any>(),
    findFirst: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    findMany: jest.fn<any>(),
  },
  matchParticipant: {
    create: jest.fn<any>(),
  },
  $disconnect: jest.fn<any>(),
};

jest.mock("../db/client", () => ({ prisma: mockPrisma }));

import {
  createPrivateMatch,
  joinPrivateMatch,
  getPrivateMatchLobbies,
} from "../db/private-match-repo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const HOST_ID = "host-user-id";
const JOINER_ID = "joiner-user-id";

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ===========================================================================
// Sprint 3 User Story 10 — Private Matches
// Story: Create private matches with password.
// ===========================================================================
describe("Sprint 3 User Story 10 - Private Matches", () => {
  // =========================================================================
  // AC1: Create private match -> lobby hidden from public queue
  // =========================================================================
  describe("AC1: Create a private match with PENDING status and PRIVATE mode", () => {
    it("creates a private match with PENDING status and PRIVATE mode", async () => {
      mockBcrypt.hash.mockResolvedValue("hashed-password");
      mockPrisma.match.create.mockResolvedValue({
        id: "match-1",
        mode: "PRIVATE",
        status: "PENDING",
        roomName: "my-room",
        passwordHash: "hashed-password",
        participants: [
          {
            userId: HOST_ID,
            startElo: 1200,
            user: { id: HOST_ID, username: "host", elo: 1200 },
          },
        ],
      });

      const result = await createPrivateMatch(HOST_ID, 1200, "my-room", "secret123");

      expect(result.mode).toBe("PRIVATE");
      expect(result.status).toBe("PENDING");
      expect(result.roomName).toBe("my-room");

      // Verify match.create was called with correct data
      expect(mockPrisma.match.create).toHaveBeenCalledTimes(1);
      const createArgs = mockPrisma.match.create.mock.calls[0][0] as any;
      expect(createArgs.data.mode).toBe("PRIVATE");
      expect(createArgs.data.status).toBe("PENDING");
      expect(createArgs.data.roomName).toBe("my-room");
      expect(createArgs.data.passwordHash).toBe("hashed-password");
    });

    it("hashes the password before storing", async () => {
      mockBcrypt.hash.mockResolvedValue("hashed-pw");
      mockPrisma.match.create.mockResolvedValue({
        id: "match-1",
        mode: "PRIVATE",
        status: "PENDING",
        roomName: "room",
        passwordHash: "hashed-pw",
        participants: [],
      });

      await createPrivateMatch(HOST_ID, 1200, "room", "my-secret");

      expect(mockBcrypt.hash).toHaveBeenCalledTimes(1);
      expect(mockBcrypt.hash).toHaveBeenCalledWith("my-secret", 12); // SALT_ROUNDS = 12
    });

    it("lobbies list does not expose password hash", async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: "match-1",
          roomName: "public-room",
          createdAt: new Date("2026-04-23T10:00:00Z"),
          participants: [
            { user: { id: HOST_ID, username: "host" } },
          ],
        },
        {
          id: "match-2",
          roomName: "another-room",
          createdAt: new Date("2026-04-23T11:00:00Z"),
          participants: [
            { user: { id: "user-2", username: "user2" } },
          ],
        },
      ]);

      const lobbies = await getPrivateMatchLobbies();

      expect(lobbies).toHaveLength(2);
      for (const lobby of lobbies) {
        // passwordHash should not be present in the returned lobby objects
        expect(lobby).not.toHaveProperty("passwordHash");
        // Verify expected fields are present
        expect(lobby).toHaveProperty("id");
        expect(lobby).toHaveProperty("roomName");
        expect(lobby).toHaveProperty("hostUsername");
        expect(lobby).toHaveProperty("playerCount");
      }
    });
  });

  // =========================================================================
  // AC2: Wrong password -> error
  // =========================================================================
  describe("AC2: Wrong password results in error", () => {
    it("throws INVALID_PASSWORD when password is wrong", async () => {
      mockPrisma.match.findFirst.mockResolvedValue({
        id: "match-1",
        roomName: "locked-room",
        mode: "PRIVATE",
        status: "PENDING",
        passwordHash: "hashed-pw",
        participants: [
          { userId: HOST_ID, user: { id: HOST_ID, username: "host", elo: 1200 } },
        ],
      });
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        joinPrivateMatch(JOINER_ID, 1100, "locked-room", "wrong-password")
      ).rejects.toThrow("INVALID_PASSWORD");
    });

    it("throws MATCH_NOT_FOUND when room doesn't exist", async () => {
      mockPrisma.match.findFirst.mockResolvedValue(null);

      await expect(
        joinPrivateMatch(JOINER_ID, 1100, "nonexistent-room", "any-password")
      ).rejects.toThrow("MATCH_NOT_FOUND");
    });
  });

  // =========================================================================
  // AC3: Host starts match -> participants can code
  // =========================================================================
  describe("AC3: Joining with correct password", () => {
    it("adds joining user as participant on correct password", async () => {
      mockPrisma.match.findFirst.mockResolvedValue({
        id: "match-1",
        roomName: "my-room",
        mode: "PRIVATE",
        status: "PENDING",
        passwordHash: "hashed-pw",
        participants: [
          { userId: HOST_ID, user: { id: HOST_ID, username: "host", elo: 1200 } },
        ],
      });
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.matchParticipant.create.mockResolvedValue({
        matchId: "match-1",
        userId: JOINER_ID,
        startElo: 1100,
      });
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "match-1",
        roomName: "my-room",
        mode: "PRIVATE",
        status: "PENDING",
        participants: [
          { userId: HOST_ID, user: { id: HOST_ID, username: "host", elo: 1200 } },
          { userId: JOINER_ID, user: { id: JOINER_ID, username: "joiner", elo: 1100 } },
        ],
      });

      await joinPrivateMatch(JOINER_ID, 1100, "my-room", "correct-password");

      expect(mockPrisma.matchParticipant.create).toHaveBeenCalledTimes(1);
      const createArgs = mockPrisma.matchParticipant.create.mock.calls[0][0] as any;
      expect(createArgs.data.matchId).toBe("match-1");
      expect(createArgs.data.userId).toBe(JOINER_ID);
      expect(createArgs.data.startElo).toBe(1100);
    });

    it("returns match with all participants after joining", async () => {
      mockPrisma.match.findFirst.mockResolvedValue({
        id: "match-1",
        roomName: "my-room",
        mode: "PRIVATE",
        status: "PENDING",
        passwordHash: "hashed-pw",
        participants: [
          { userId: HOST_ID, user: { id: HOST_ID, username: "host", elo: 1200 } },
        ],
      });
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.matchParticipant.create.mockResolvedValue({
        matchId: "match-1",
        userId: JOINER_ID,
        startElo: 1100,
      });
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "match-1",
        roomName: "my-room",
        mode: "PRIVATE",
        status: "PENDING",
        participants: [
          { userId: HOST_ID, user: { id: HOST_ID, username: "host", elo: 1200 } },
          { userId: JOINER_ID, user: { id: JOINER_ID, username: "joiner", elo: 1100 } },
        ],
      });

      const result = await joinPrivateMatch(JOINER_ID, 1100, "my-room", "correct-password");

      // Verify findUnique was called to re-fetch the match
      expect(mockPrisma.match.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.match.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "match-1" },
        })
      );

      // Result should contain both participants
      expect(result!.participants).toHaveLength(2);
      const userIds = result!.participants.map((p: any) => p.userId);
      expect(userIds).toContain(HOST_ID);
      expect(userIds).toContain(JOINER_ID);
    });
  });
});
