import { describe, it, expect, beforeEach, jest, afterAll } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mock Prisma client (CJS-style) before any imports that use it
// ---------------------------------------------------------------------------
const mockPrisma = {
  $queryRaw: jest.fn<any>(),
  $disconnect: jest.fn<any>(),
};

jest.mock("../db/client", () => ({
  prisma: mockPrisma,
}));

import {
  getLeaderboardWithStats,
  getUserLeaderboardPosition,
} from "../db/match-repo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const USER_A = "user-a-id";
const USER_B = "user-b-id";
const USER_C = "user-c-id";

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ===========================================================================
// Sprint 3 User Story 3 - Leaderboard
// Story: See how my current Elo stacks up with an active leaderboard.
// ===========================================================================
describe("Sprint 3 User Story 3 - Leaderboard", () => {
  // =========================================================================
  // AC1: Users sorted descending by Elo
  // =========================================================================
  describe("AC1: Users sorted descending by Elo", () => {
    it("returns users sorted by elo descending", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: USER_A, username: "alice", elo: 1800, total_matches: BigInt(10), wins: BigInt(7) },
        { id: USER_B, username: "bob",   elo: 1500, total_matches: BigInt(8),  wins: BigInt(4) },
        { id: USER_C, username: "carol", elo: 1200, total_matches: BigInt(5),  wins: BigInt(1) },
      ]);

      const result = await getLeaderboardWithStats(100);

      expect(result).toHaveLength(3);
      expect(result[0].elo).toBe(1800);
      expect(result[1].elo).toBe(1500);
      expect(result[2].elo).toBe(1200);
      // Verify ordering is descending
      expect(result[0].elo).toBeGreaterThan(result[1].elo);
      expect(result[1].elo).toBeGreaterThan(result[2].elo);
    });

    it("assigns rank starting from 1", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: USER_A, username: "alice", elo: 1800, total_matches: BigInt(10), wins: BigInt(7) },
        { id: USER_B, username: "bob",   elo: 1500, total_matches: BigInt(8),  wins: BigInt(4) },
        { id: USER_C, username: "carol", elo: 1200, total_matches: BigInt(5),  wins: BigInt(1) },
      ]);

      const result = await getLeaderboardWithStats(100);

      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(3);
    });
  });

  // =========================================================================
  // AC2: Own entry highlighted (getUserLeaderboardPosition returns rank)
  // =========================================================================
  describe("AC2: getUserLeaderboardPosition returns the user's rank and stats", () => {
    it("getUserLeaderboardPosition returns the user's rank and stats", async () => {
      // First $queryRaw call: user stats
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: USER_A, elo: 1500, total_matches: BigInt(10), wins: BigInt(6) },
      ]);
      // Second $queryRaw call: rank count
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { rank: BigInt(5) },
      ]);

      const result = await getUserLeaderboardPosition(USER_A);

      expect(result).not.toBeNull();
      expect(result!.rank).toBe(5);
      expect(result!.elo).toBe(1500);
      expect(result!.winRate).toBe(0.6);
    });

    it("returns null if user not found", async () => {
      // First $queryRaw call: empty result (user not found)
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const result = await getUserLeaderboardPosition("nonexistent-user-id");

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // AC3: Same Elo -> secondary sort by win rate
  // =========================================================================
  describe("AC3: Same Elo sorted by win rate descending", () => {
    it("users with same elo are sorted by win rate descending", async () => {
      // Both users have elo 1500, but alice has higher win rate
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: USER_A, username: "alice", elo: 1500, total_matches: BigInt(10), wins: BigInt(8) },
        { id: USER_B, username: "bob",   elo: 1500, total_matches: BigInt(10), wins: BigInt(5) },
      ]);

      const result = await getLeaderboardWithStats(100);

      expect(result).toHaveLength(2);
      expect(result[0].elo).toBe(result[1].elo); // Same elo
      expect(result[0].winRate).toBeGreaterThan(result[1].winRate); // Higher win rate first
      expect(result[0].username).toBe("alice");
      expect(result[1].username).toBe("bob");
    });

    it("winRate is calculated as wins / total matches", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: USER_A, username: "alice", elo: 1500, total_matches: BigInt(20), wins: BigInt(15) },
        { id: USER_B, username: "bob",   elo: 1400, total_matches: BigInt(10), wins: BigInt(3) },
      ]);

      const result = await getLeaderboardWithStats(100);

      // alice: 15/20 = 0.75
      expect(result[0].winRate).toBe(0.75);
      // bob: 3/10 = 0.3
      expect(result[1].winRate).toBe(0.3);
    });

    it("winRate is 0 when user has no matches", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: USER_A, username: "alice", elo: 1200, total_matches: BigInt(0), wins: BigInt(0) },
      ]);

      const result = await getLeaderboardWithStats(100);

      expect(result[0].winRate).toBe(0);
    });

    it("respects the limit parameter", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: USER_A, username: "alice", elo: 1800, total_matches: BigInt(10), wins: BigInt(7) },
        { id: USER_B, username: "bob",   elo: 1500, total_matches: BigInt(8),  wins: BigInt(4) },
      ]);

      const result = await getLeaderboardWithStats(2);

      expect(result).toHaveLength(2);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("returns empty array when no users exist", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const result = await getLeaderboardWithStats(100);

      expect(result).toEqual([]);
    });
  });
});
