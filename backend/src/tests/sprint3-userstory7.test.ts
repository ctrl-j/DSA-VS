import { describe, it, expect, beforeEach, jest, afterAll } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mock Prisma client (CJS-style) before any imports that use it
// ---------------------------------------------------------------------------
const mockPrisma = {
  problem: {
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    update: jest.fn<any>(),
  },
  $disconnect: jest.fn<any>(),
};

jest.mock("../db/client", () => ({ prisma: mockPrisma }));

import {
  getPendingSubmissions,
  approveSubmission,
  rejectSubmission,
} from "../db/problem-submission-repo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PROBLEM_ID = "problem-1";
const SUBMITTER_ID = "user-submitter";

function makePendingProblem(overrides: Record<string, unknown> = {}) {
  return {
    id: PROBLEM_ID,
    title: "Two Sum",
    statement: "Given an array...",
    difficulty: "EASY",
    category: "arrays",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    isActive: false,
    approvalStatus: "PENDING",
    submittedById: SUBMITTER_ID,
    createdAt: new Date("2026-04-20T10:00:00Z"),
    submittedBy: { id: SUBMITTER_ID, username: "studentA" },
    _count: { testCases: 5 },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ===========================================================================
// Sprint 3 User Story 7 — Admin Review of Submitted Problems
// ===========================================================================
describe("Sprint 3 User Story 7 - Admin Review", () => {
  // -------------------------------------------------------------------------
  // AC1: Admin sees list of pending submissions (getPendingSubmissions)
  // -------------------------------------------------------------------------
  describe("AC1: Admin sees list of pending submissions", () => {
    it("returns all problems with PENDING status", async () => {
      const pending = [
        makePendingProblem({ id: "p-1", title: "Two Sum" }),
        makePendingProblem({ id: "p-2", title: "Reverse String" }),
      ];
      mockPrisma.problem.findMany.mockResolvedValue(pending);

      const result = await getPendingSubmissions();

      expect(result).toHaveLength(2);
      expect(result[0].approvalStatus).toBe("PENDING");
      expect(result[1].approvalStatus).toBe("PENDING");
      expect(mockPrisma.problem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { approvalStatus: "PENDING" },
        })
      );
    });

    it("includes submitter info and test case counts", async () => {
      mockPrisma.problem.findMany.mockResolvedValue([makePendingProblem()]);

      const result = await getPendingSubmissions();

      expect(result[0].submittedBy).toEqual({
        id: SUBMITTER_ID,
        username: "studentA",
      });
      expect(result[0]._count.testCases).toBe(5);
      expect(mockPrisma.problem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            submittedBy: expect.objectContaining({
              select: expect.objectContaining({
                id: true,
                username: true,
              }),
            }),
            _count: expect.objectContaining({
              select: expect.objectContaining({ testCases: true }),
            }),
          }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // AC2: Reject -> feedback stored (rejectSubmission)
  // -------------------------------------------------------------------------
  describe("AC2: Reject stores feedback", () => {
    it("sets approvalStatus to REJECTED and stores feedback", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        id: PROBLEM_ID,
        approvalStatus: "PENDING",
      });
      mockPrisma.problem.update.mockResolvedValue(
        makePendingProblem({
          approvalStatus: "REJECTED",
          rejectionFeedback: "Insufficient test cases",
          isActive: false,
        })
      );

      const feedback = "Insufficient test cases";
      await rejectSubmission(PROBLEM_ID, feedback);

      expect(mockPrisma.problem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PROBLEM_ID },
          data: expect.objectContaining({
            approvalStatus: "REJECTED",
            rejectionFeedback: feedback,
            isActive: false,
          }),
        })
      );
    });

    it("throws PROBLEM_NOT_FOUND for nonexistent problem", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue(null);

      await expect(
        rejectSubmission("nonexistent-id", "Bad problem")
      ).rejects.toThrow("PROBLEM_NOT_FOUND");

      expect(mockPrisma.problem.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // AC3: Approve -> problem becomes active (approveSubmission)
  // -------------------------------------------------------------------------
  describe("AC3: Approve makes problem active", () => {
    it("sets approvalStatus to APPROVED and isActive to true", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        id: PROBLEM_ID,
        approvalStatus: "PENDING",
      });
      mockPrisma.problem.update.mockResolvedValue(
        makePendingProblem({
          approvalStatus: "APPROVED",
          isActive: true,
        })
      );

      await approveSubmission(PROBLEM_ID);

      expect(mockPrisma.problem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PROBLEM_ID },
          data: expect.objectContaining({
            approvalStatus: "APPROVED",
            isActive: true,
          }),
        })
      );
    });

    it("adds problem to active pool (isActive true)", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        id: PROBLEM_ID,
        approvalStatus: "PENDING",
      });
      mockPrisma.problem.update.mockResolvedValue(
        makePendingProblem({ approvalStatus: "APPROVED", isActive: true })
      );

      const result = await approveSubmission(PROBLEM_ID);

      expect(result.isActive).toBe(true);
      expect(result.approvalStatus).toBe("APPROVED");
    });

    it("throws PROBLEM_NOT_FOUND for nonexistent problem", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue(null);

      await expect(approveSubmission("nonexistent-id")).rejects.toThrow(
        "PROBLEM_NOT_FOUND"
      );

      expect(mockPrisma.problem.update).not.toHaveBeenCalled();
    });
  });
});
