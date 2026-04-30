import { describe, it, expect, beforeEach, jest, afterAll } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mock Prisma client before any imports that use it
// ---------------------------------------------------------------------------
const mockPrisma = {
  matchParticipant: { findMany: jest.fn<any>() },
  user: { findMany: jest.fn<any>() },
  $disconnect: jest.fn<any>(),
};

jest.mock("../db/client", () => ({ prisma: mockPrisma }));

import {
  getHardProblemSolveTimeDistribution,
  getCategorySuccessRates,
  getMedianElo,
} from "../db/stats-repo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ===========================================================================
// Sprint 3 User Story 9 — Statistics for Employers
// Story: See current level of programmers for job requirements.
// ===========================================================================
describe("Sprint 3 User Story 9 - Statistics for Employers", () => {
  // =========================================================================
  // AC1: Distribution graph of solve times for hard problems
  // =========================================================================
  describe("AC1: getHardProblemSolveTimeDistribution", () => {
    it("returns solve time buckets for hard problems", async () => {
      mockPrisma.matchParticipant.findMany.mockResolvedValue([
        {
          reachedPassedAt: new Date("2026-04-23T10:03:00Z"), // 3 min -> 0-5min
          passedCount: 5,
          match: {
            startedAt: new Date("2026-04-23T10:00:00Z"),
            problem: { testCases: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }] },
          },
        },
        {
          reachedPassedAt: new Date("2026-04-23T10:07:00Z"), // 7 min -> 5-10min
          passedCount: 5,
          match: {
            startedAt: new Date("2026-04-23T10:00:00Z"),
            problem: { testCases: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }] },
          },
        },
        {
          reachedPassedAt: new Date("2026-04-23T10:22:00Z"), // 22 min -> 20-25min
          passedCount: 5,
          match: {
            startedAt: new Date("2026-04-23T10:00:00Z"),
            problem: { testCases: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }] },
          },
        },
      ]);

      const result = await getHardProblemSolveTimeDistribution();

      // Should be an array of bucket objects
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(6);

      const bucketMap: Record<string, number> = {};
      for (const b of result) {
        bucketMap[b.bucket] = b.count;
      }

      expect(bucketMap["0-5min"]).toBe(1);
      expect(bucketMap["5-10min"]).toBe(1);
      expect(bucketMap["10-15min"]).toBe(0);
      expect(bucketMap["15-20min"]).toBe(0);
      expect(bucketMap["20-25min"]).toBe(1);
      expect(bucketMap["25min+"]).toBe(0);
    });

    it("only counts participants who passed all tests", async () => {
      mockPrisma.matchParticipant.findMany.mockResolvedValue([
        {
          // Passed all 5 tests — should be counted
          reachedPassedAt: new Date("2026-04-23T10:04:00Z"),
          passedCount: 5,
          match: {
            startedAt: new Date("2026-04-23T10:00:00Z"),
            problem: { testCases: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }] },
          },
        },
        {
          // Only passed 3 of 5 — should NOT be counted
          reachedPassedAt: new Date("2026-04-23T10:06:00Z"),
          passedCount: 3,
          match: {
            startedAt: new Date("2026-04-23T10:00:00Z"),
            problem: { testCases: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }] },
          },
        },
      ]);

      const result = await getHardProblemSolveTimeDistribution();

      const total = result.reduce((sum, b) => sum + b.count, 0);
      expect(total).toBe(1); // Only the first participant counted

      const bucketMap: Record<string, number> = {};
      for (const b of result) {
        bucketMap[b.bucket] = b.count;
      }
      expect(bucketMap["0-5min"]).toBe(1);
    });

    it("returns zero counts when no data", async () => {
      mockPrisma.matchParticipant.findMany.mockResolvedValue([]);

      const result = await getHardProblemSolveTimeDistribution();

      expect(result).toHaveLength(6);
      for (const b of result) {
        expect(b.count).toBe(0);
      }
    });
  });

  // =========================================================================
  // AC2: Average success rate per category
  // =========================================================================
  describe("AC2: getCategorySuccessRates", () => {
    it("calculates success rate per category", async () => {
      mockPrisma.matchParticipant.findMany.mockResolvedValue([
        {
          passedCount: 5,
          match: {
            problem: {
              category: "arrays",
              testCases: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }],
            },
          },
        },
        {
          passedCount: 3,
          match: {
            problem: {
              category: "arrays",
              testCases: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }],
            },
          },
        },
        {
          passedCount: 4,
          match: {
            problem: {
              category: "strings",
              testCases: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }],
            },
          },
        },
      ]);

      const result = await getCategorySuccessRates();

      // arrays: 1 success out of 2 attempts -> 50%
      const arrays = result.find((r) => r.category === "arrays");
      expect(arrays).toBeDefined();
      expect(arrays!.totalAttempts).toBe(2);
      expect(arrays!.successCount).toBe(1);
      expect(arrays!.successRate).toBe(50);

      // strings: 1 success out of 1 attempt -> 100%
      const strings = result.find((r) => r.category === "strings");
      expect(strings).toBeDefined();
      expect(strings!.totalAttempts).toBe(1);
      expect(strings!.successCount).toBe(1);
      expect(strings!.successRate).toBe(100);
    });

    it("filters by category when provided", async () => {
      mockPrisma.matchParticipant.findMany.mockResolvedValue([
        {
          passedCount: 5,
          match: {
            problem: {
              category: "arrays",
              testCases: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }],
            },
          },
        },
      ]);

      await getCategorySuccessRates("arrays");

      // Verify the findMany was called with a where clause that includes the category
      expect(mockPrisma.matchParticipant.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.matchParticipant.findMany.mock.calls[0][0] as any;
      expect(callArgs.where.match.problem).toEqual({ category: "arrays" });
    });
  });

  // =========================================================================
  // AC3: Median Elo
  // =========================================================================
  describe("AC3: getMedianElo", () => {
    it("returns median for odd number of users", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { elo: 800 },
        { elo: 1000 },
        { elo: 1200 },
      ]);

      const result = await getMedianElo();

      expect(result).toBe(1000);
    });

    it("returns median for even number of users", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { elo: 800 },
        { elo: 1000 },
        { elo: 1200 },
        { elo: 1400 },
      ]);

      const result = await getMedianElo();

      expect(result).toBe(1100);
    });

    it("returns 0 when no users", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await getMedianElo();

      expect(result).toBe(0);
    });
  });
});
