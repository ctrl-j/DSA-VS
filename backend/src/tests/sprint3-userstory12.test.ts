import { describe, it, expect, beforeEach, jest, afterAll } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mock Prisma client before any imports that use it
// ---------------------------------------------------------------------------
const mockPrisma = {
  matchParticipant: {
    findMany: jest.fn<any>(),
  },
  $disconnect: jest.fn<any>(),
};

jest.mock("../db/client", () => ({ prisma: mockPrisma }));

import {
  getLanguageWinLoss,
  getLanguageTestCasesPassed,
  getTopLanguages,
} from "../db/language-stats-repo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const USER_ID = "user-a-id";
const OPPONENT_ID = "user-b-id";

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ===========================================================================
// Sprint 3 User Story 12 — Language Statistics
// Story: See what languages students excel at.
// ===========================================================================
describe("Sprint 3 User Story 12 - Language Statistics", () => {
  // =========================================================================
  // AC1: Win/loss ratio per language
  // =========================================================================
  describe("AC1: getLanguageWinLoss", () => {
    it("calculates win/loss per language", async () => {
      // First call: user's participations
      mockPrisma.matchParticipant.findMany.mockResolvedValueOnce([
        { matchId: "m1", language: "python", passedCount: 5, reachedPassedAt: new Date("2026-04-23T10:03:00Z") },
        { matchId: "m2", language: "python", passedCount: 5, reachedPassedAt: new Date("2026-04-23T11:03:00Z") },
        { matchId: "m3", language: "python", passedCount: 2, reachedPassedAt: null },
      ]);

      // Second call: all participants for those matches
      mockPrisma.matchParticipant.findMany.mockResolvedValueOnce([
        // match m1: user won (5 vs 3)
        { matchId: "m1", userId: USER_ID, passedCount: 5, reachedPassedAt: new Date("2026-04-23T10:03:00Z") },
        { matchId: "m1", userId: OPPONENT_ID, passedCount: 3, reachedPassedAt: null },
        // match m2: user won (5 vs 4)
        { matchId: "m2", userId: USER_ID, passedCount: 5, reachedPassedAt: new Date("2026-04-23T11:03:00Z") },
        { matchId: "m2", userId: OPPONENT_ID, passedCount: 4, reachedPassedAt: null },
        // match m3: user lost (2 vs 5)
        { matchId: "m3", userId: USER_ID, passedCount: 2, reachedPassedAt: null },
        { matchId: "m3", userId: OPPONENT_ID, passedCount: 5, reachedPassedAt: new Date("2026-04-23T12:03:00Z") },
      ]);

      const result = await getLanguageWinLoss(USER_ID);

      expect(result).toHaveLength(1);
      const python = result.find((r) => r.language === "python");
      expect(python).toBeDefined();
      expect(python!.wins).toBe(2);
      expect(python!.losses).toBe(1);
      expect(python!.total).toBe(3);
      expect(python!.winRate).toBeCloseTo(0.667, 2);
    });

    it("returns empty array when no matches", async () => {
      mockPrisma.matchParticipant.findMany.mockResolvedValueOnce([]);

      const result = await getLanguageWinLoss(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // AC2: Test cases passed per language
  // =========================================================================
  describe("AC2: getLanguageTestCasesPassed", () => {
    it("sums passed test cases per language", async () => {
      mockPrisma.matchParticipant.findMany.mockResolvedValue([
        { language: "python", passedCount: 5 },
        { language: "python", passedCount: 3 },
        { language: "cpp", passedCount: 7 },
      ]);

      const result = await getLanguageTestCasesPassed(USER_ID);

      const python = result.find((r) => r.language === "python");
      const cpp = result.find((r) => r.language === "cpp");

      expect(python!.totalPassed).toBe(8);  // 5 + 3
      expect(cpp!.totalPassed).toBe(7);
    });
  });

  // =========================================================================
  // AC3: Top languages on profile
  // =========================================================================
  describe("AC3: getTopLanguages", () => {
    it("returns languages sorted by match count", async () => {
      // getTopLanguages calls getLanguageWinLoss and getLanguageTestCasesPassed
      // concurrently via Promise.all. Each calls matchParticipant.findMany
      // with different where clauses, so we use mockImplementation to route them.
      let callCount = 0;
      mockPrisma.matchParticipant.findMany.mockImplementation(async (args: any) => {
        callCount++;
        // Call 1 from getLanguageWinLoss: user's participations (has userId, language not null, match.status)
        if (args?.where?.userId && args?.where?.language && args?.where?.match?.status) {
          return [
            { matchId: "m1", language: "python", passedCount: 5, reachedPassedAt: new Date("2026-04-23T10:03:00Z") },
            { matchId: "m2", language: "python", passedCount: 5, reachedPassedAt: new Date("2026-04-23T11:03:00Z") },
            { matchId: "m3", language: "python", passedCount: 4, reachedPassedAt: null },
            { matchId: "m4", language: "cpp", passedCount: 5, reachedPassedAt: new Date("2026-04-23T12:03:00Z") },
          ];
        }
        // Call 2 from getLanguageWinLoss: all participants for matches (has matchId in)
        if (args?.where?.matchId?.in) {
          return [
            { matchId: "m1", userId: USER_ID, passedCount: 5, reachedPassedAt: new Date("2026-04-23T10:03:00Z") },
            { matchId: "m1", userId: OPPONENT_ID, passedCount: 3, reachedPassedAt: null },
            { matchId: "m2", userId: USER_ID, passedCount: 5, reachedPassedAt: new Date("2026-04-23T11:03:00Z") },
            { matchId: "m2", userId: OPPONENT_ID, passedCount: 4, reachedPassedAt: null },
            { matchId: "m3", userId: USER_ID, passedCount: 4, reachedPassedAt: null },
            { matchId: "m3", userId: OPPONENT_ID, passedCount: 5, reachedPassedAt: new Date("2026-04-23T11:30:00Z") },
            { matchId: "m4", userId: USER_ID, passedCount: 5, reachedPassedAt: new Date("2026-04-23T12:03:00Z") },
            { matchId: "m4", userId: OPPONENT_ID, passedCount: 2, reachedPassedAt: null },
          ];
        }
        // Call from getLanguageTestCasesPassed: user participations with language (no match.status filter)
        if (args?.where?.userId && args?.where?.language) {
          return [
            { language: "python", passedCount: 5 },
            { language: "python", passedCount: 5 },
            { language: "python", passedCount: 4 },
            { language: "cpp", passedCount: 5 },
          ];
        }
        return [];
      });

      const result = await getTopLanguages(USER_ID);

      // Python has 3 matches, cpp has 1 -> python should be first
      expect(result[0].language).toBe("python");
      expect(result[0].matchCount).toBe(3);
      expect(result[1].language).toBe("cpp");
      expect(result[1].matchCount).toBe(1);
    });

    it("limits results to the specified count", async () => {
      mockPrisma.matchParticipant.findMany.mockImplementation(async (args: any) => {
        // getLanguageWinLoss: user's completed participations
        if (args?.where?.userId && args?.where?.language && args?.where?.match?.status) {
          return [
            { matchId: "m1", language: "python", passedCount: 5, reachedPassedAt: new Date("2026-04-23T10:03:00Z") },
            { matchId: "m2", language: "cpp", passedCount: 5, reachedPassedAt: new Date("2026-04-23T11:03:00Z") },
            { matchId: "m3", language: "java", passedCount: 4, reachedPassedAt: null },
          ];
        }
        // getLanguageWinLoss: all participants for those matches
        if (args?.where?.matchId?.in) {
          return [
            { matchId: "m1", userId: USER_ID, passedCount: 5, reachedPassedAt: new Date("2026-04-23T10:03:00Z") },
            { matchId: "m1", userId: OPPONENT_ID, passedCount: 3, reachedPassedAt: null },
            { matchId: "m2", userId: USER_ID, passedCount: 5, reachedPassedAt: new Date("2026-04-23T11:03:00Z") },
            { matchId: "m2", userId: OPPONENT_ID, passedCount: 2, reachedPassedAt: null },
            { matchId: "m3", userId: USER_ID, passedCount: 4, reachedPassedAt: null },
            { matchId: "m3", userId: OPPONENT_ID, passedCount: 5, reachedPassedAt: new Date("2026-04-23T12:00:00Z") },
          ];
        }
        // getLanguageTestCasesPassed: user participations with language
        if (args?.where?.userId && args?.where?.language) {
          return [
            { language: "python", passedCount: 5 },
            { language: "cpp", passedCount: 5 },
            { language: "java", passedCount: 4 },
          ];
        }
        return [];
      });

      const result = await getTopLanguages(USER_ID, 2);

      expect(result).toHaveLength(2);
    });
  });
});
