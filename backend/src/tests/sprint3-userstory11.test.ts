import { describe, it, expect, beforeEach, jest, afterAll } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mock Prisma client before any imports that use it
// ---------------------------------------------------------------------------
const mockPrisma = {
  focusSession: {
    create: jest.fn<any>(),
    findMany: jest.fn<any>(),
  },
  $disconnect: jest.fn<any>(),
};

jest.mock("../db/client", () => ({ prisma: mockPrisma }));

import {
  recordFocusSession,
  getFocusByDayOfWeek,
  getFocusByCategory,
} from "../db/focus-repo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const USER_ID = "user-a-id";

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ===========================================================================
// Sprint 3 User Story 11 — Focus Tracking
// Story: Track focus on problem categories.
// ===========================================================================
describe("Sprint 3 User Story 11 - Focus Tracking", () => {
  // =========================================================================
  // AC1: Track active time on a category
  // =========================================================================
  describe("AC1: recordFocusSession", () => {
    it("records a focus session with userId, category, and durationMs", async () => {
      mockPrisma.focusSession.create.mockResolvedValue({
        id: "focus-1",
        userId: USER_ID,
        category: "arrays",
        durationMs: 300000,
        date: new Date("2026-04-23T10:00:00Z"),
      });

      await recordFocusSession(USER_ID, "arrays", 300000);

      expect(mockPrisma.focusSession.create).toHaveBeenCalledTimes(1);
      const createArgs = mockPrisma.focusSession.create.mock.calls[0][0] as any;
      expect(createArgs.data.userId).toBe(USER_ID);
      expect(createArgs.data.category).toBe("arrays");
      expect(createArgs.data.durationMs).toBe(300000);
    });

    it("stores the current date with the session", async () => {
      mockPrisma.focusSession.create.mockResolvedValue({
        id: "focus-1",
        userId: USER_ID,
        category: "strings",
        durationMs: 120000,
        date: new Date(),
      });

      await recordFocusSession(USER_ID, "strings", 120000);

      const createArgs = mockPrisma.focusSession.create.mock.calls[0][0] as any;
      expect(createArgs.data.date).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // AC2: Focus by day of week
  // =========================================================================
  describe("AC2: getFocusByDayOfWeek", () => {
    it("aggregates focus time by day of week", async () => {
      // Monday = 1 (getDay()), Wednesday = 3, Friday = 5
      mockPrisma.focusSession.findMany.mockResolvedValue([
        { date: new Date("2026-04-20T10:00:00Z"), durationMs: 60000 },  // Monday (getDay=1)
        { date: new Date("2026-04-20T14:00:00Z"), durationMs: 30000 },  // Monday again
        { date: new Date("2026-04-22T10:00:00Z"), durationMs: 45000 },  // Wednesday (getDay=3)
        { date: new Date("2026-04-24T10:00:00Z"), durationMs: 90000 },  // Friday (getDay=5)
      ]);

      const result = await getFocusByDayOfWeek(USER_ID);

      expect(result).toHaveLength(7);

      // Find entries by day
      const monday = result.find((r) => r.dayOfWeek === 1);
      const wednesday = result.find((r) => r.dayOfWeek === 3);
      const friday = result.find((r) => r.dayOfWeek === 5);

      expect(monday!.totalMs).toBe(90000);  // 60000 + 30000
      expect(wednesday!.totalMs).toBe(45000);
      expect(friday!.totalMs).toBe(90000);
    });

    it("returns zero for days with no sessions", async () => {
      // Only Monday sessions
      mockPrisma.focusSession.findMany.mockResolvedValue([
        { date: new Date("2026-04-20T10:00:00Z"), durationMs: 60000 },  // Monday
      ]);

      const result = await getFocusByDayOfWeek(USER_ID);

      expect(result).toHaveLength(7);

      // Monday should have data
      const monday = result.find((r) => r.dayOfWeek === 1);
      expect(monday!.totalMs).toBe(60000);

      // All other days should be 0
      for (const entry of result) {
        if (entry.dayOfWeek !== 1) {
          expect(entry.totalMs).toBe(0);
        }
      }
    });
  });

  // =========================================================================
  // AC3: Focus by category (strengths)
  // =========================================================================
  describe("AC3: getFocusByCategory", () => {
    it("aggregates focus time by category", async () => {
      mockPrisma.focusSession.findMany.mockResolvedValue([
        { category: "arrays", durationMs: 120000 },
        { category: "arrays", durationMs: 80000 },
        { category: "strings", durationMs: 60000 },
        { category: "math", durationMs: 45000 },
      ]);

      const result = await getFocusByCategory(USER_ID);

      const arrays = result.find((r) => r.category === "arrays");
      const strings = result.find((r) => r.category === "strings");
      const math = result.find((r) => r.category === "math");

      expect(arrays!.totalMs).toBe(200000);  // 120000 + 80000
      expect(strings!.totalMs).toBe(60000);
      expect(math!.totalMs).toBe(45000);
    });

    it("returns empty array when no sessions", async () => {
      mockPrisma.focusSession.findMany.mockResolvedValue([]);

      const result = await getFocusByCategory(USER_ID);

      expect(result).toEqual([]);
    });
  });
});
