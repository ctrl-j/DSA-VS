import { describe, it, expect, beforeEach, jest, afterAll } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mock Prisma client (CJS-style) before any imports that use it
// ---------------------------------------------------------------------------
const mockPrisma = {
  problem: {
    findUnique: jest.fn<any>(),
    update: jest.fn<any>(),
  },
  $disconnect: jest.fn<any>(),
};

jest.mock("../db/client", () => ({ prisma: mockPrisma }));

import {
  getSubmissionForEdit,
  updateSubmission,
} from "../db/problem-submission-repo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const USER_ID = "user-owner-id";
const OTHER_USER_ID = "user-other-id";
const PROBLEM_ID = "problem-1";

function makeProblem(overrides: Record<string, unknown> = {}) {
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
    submittedById: USER_ID,
    testCases: [
      { id: "tc-1", input: "[[1,2],3]", expectedOutput: "[0,1]", isHidden: false },
      { id: "tc-2", input: "[[3,4],7]", expectedOutput: "[0,1]", isHidden: true },
    ],
    _count: { testCases: 2 },
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
// Sprint 3 User Story 6 — Edit/Update Problems
// ===========================================================================
describe("Sprint 3 User Story 6 - Edit/Update Problems", () => {
  // -------------------------------------------------------------------------
  // AC1: Edit opens with previous data (getSubmissionForEdit)
  // -------------------------------------------------------------------------
  describe("AC1: Edit opens with previous data", () => {
    it("returns problem with test cases when owned and pending", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue(makeProblem());

      const result = await getSubmissionForEdit(USER_ID, PROBLEM_ID);

      expect(result.id).toBe(PROBLEM_ID);
      expect(result.title).toBe("Two Sum");
      expect(result.testCases).toHaveLength(2);
      expect(result._count.testCases).toBe(2);
      expect(result.approvalStatus).toBe("PENDING");
      expect(mockPrisma.problem.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PROBLEM_ID },
          include: expect.objectContaining({
            testCases: true,
          }),
        })
      );
    });

    it("throws FORBIDDEN when problem not owned by user", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue(
        makeProblem({ submittedById: OTHER_USER_ID })
      );

      await expect(
        getSubmissionForEdit(USER_ID, PROBLEM_ID)
      ).rejects.toThrow("FORBIDDEN");
    });

    it("throws PROBLEM_NOT_FOUND when problem doesn't exist", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue(null);

      await expect(
        getSubmissionForEdit(USER_ID, "nonexistent-id")
      ).rejects.toThrow("PROBLEM_NOT_FOUND");
    });
  });

  // -------------------------------------------------------------------------
  // AC2: Modify difficulty -> backend changes value (updateSubmission)
  // -------------------------------------------------------------------------
  describe("AC2: Modify fields on a pending problem", () => {
    it("updates difficulty when problem is pending", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        submittedById: USER_ID,
        approvalStatus: "PENDING",
      });
      mockPrisma.problem.update.mockResolvedValue(
        makeProblem({ difficulty: "HARD" })
      );

      await updateSubmission(USER_ID, PROBLEM_ID, { difficulty: "HARD" as any });

      expect(mockPrisma.problem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PROBLEM_ID },
          data: expect.objectContaining({ difficulty: "HARD" }),
        })
      );
    });

    it("updates title and category fields", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        submittedById: USER_ID,
        approvalStatus: "PENDING",
      });
      mockPrisma.problem.update.mockResolvedValue(
        makeProblem({ title: "Three Sum", category: "hash-tables" })
      );

      await updateSubmission(USER_ID, PROBLEM_ID, {
        title: "Three Sum",
        category: "hash-tables",
      });

      expect(mockPrisma.problem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PROBLEM_ID },
          data: expect.objectContaining({
            title: "Three Sum",
            category: "hash-tables",
          }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // AC3: Approved problem -> edit disabled (throws error)
  // -------------------------------------------------------------------------
  describe("AC3: Approved or rejected problem cannot be edited", () => {
    it("throws PROBLEM_ALREADY_APPROVED when status is APPROVED", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        submittedById: USER_ID,
        approvalStatus: "APPROVED",
      });

      await expect(
        updateSubmission(USER_ID, PROBLEM_ID, { title: "New Title" })
      ).rejects.toThrow("PROBLEM_ALREADY_APPROVED");

      expect(mockPrisma.problem.update).not.toHaveBeenCalled();
    });

    it("throws PROBLEM_NOT_EDITABLE when status is REJECTED", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        submittedById: USER_ID,
        approvalStatus: "REJECTED",
      });

      await expect(
        updateSubmission(USER_ID, PROBLEM_ID, { title: "New Title" })
      ).rejects.toThrow("PROBLEM_NOT_EDITABLE");

      expect(mockPrisma.problem.update).not.toHaveBeenCalled();
    });
  });
});
