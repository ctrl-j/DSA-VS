import { describe, it, expect, beforeEach, jest, afterAll } from "@jest/globals";
import { ApprovalStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Mock Prisma client (CJS-style) before any imports that use it
// ---------------------------------------------------------------------------
const mockPrisma = {
  problem: {
    create: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    findMany: jest.fn<any>(),
    update: jest.fn<any>(),
  },
  testCase: {
    create: jest.fn<any>(),
    count: jest.fn<any>(),
  },
  $disconnect: jest.fn<any>(),
};

jest.mock("../db/client", () => ({
  prisma: mockPrisma,
}));

import { submitProblem } from "../db/problem-submission-repo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const USER_A = "user-a-id";

const validProblemData = {
  title: "Two Sum",
  statement: "Given an array of integers nums and an integer target, return indices...",
  difficulty: "EASY" as const,
  category: "arrays",
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ===========================================================================
// Sprint 3 User Story 4 - Submit Problems
// Story: Submit problems to the problem set.
// ===========================================================================
describe("Sprint 3 User Story 4 - Submit Problems", () => {
  // =========================================================================
  // AC1: Required field blank -> error (validation at route level, but
  //      we verify the repo correctly passes all fields to Prisma)
  // =========================================================================
  describe("AC1: Required fields are passed to Prisma correctly", () => {
    it("passes title to prisma.problem.create", async () => {
      const createdProblem = {
        id: "problem-1",
        ...validProblemData,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        isActive: false,
        approvalStatus: ApprovalStatus.PENDING,
        submittedById: USER_A,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.problem.create.mockResolvedValue(createdProblem);

      await submitProblem(USER_A, validProblemData);

      expect(mockPrisma.problem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Two Sum",
        }),
      });
    });

    it("passes statement, difficulty, and category to prisma.problem.create", async () => {
      const createdProblem = {
        id: "problem-1",
        ...validProblemData,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        isActive: false,
        approvalStatus: ApprovalStatus.PENDING,
        submittedById: USER_A,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.problem.create.mockResolvedValue(createdProblem);

      await submitProblem(USER_A, validProblemData);

      expect(mockPrisma.problem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          statement: validProblemData.statement,
          difficulty: "EASY",
          category: "arrays",
        }),
      });
    });

    it("uses default timeLimitMs and memoryLimitMb when not provided", async () => {
      const createdProblem = {
        id: "problem-1",
        ...validProblemData,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        isActive: false,
        approvalStatus: ApprovalStatus.PENDING,
        submittedById: USER_A,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.problem.create.mockResolvedValue(createdProblem);

      await submitProblem(USER_A, validProblemData);

      expect(mockPrisma.problem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timeLimitMs: 2000,
          memoryLimitMb: 256,
        }),
      });
    });

    it("uses custom timeLimitMs and memoryLimitMb when provided", async () => {
      const customData = {
        ...validProblemData,
        timeLimitMs: 5000,
        memoryLimitMb: 512,
      };
      const createdProblem = {
        id: "problem-1",
        ...customData,
        isActive: false,
        approvalStatus: ApprovalStatus.PENDING,
        submittedById: USER_A,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.problem.create.mockResolvedValue(createdProblem);

      await submitProblem(USER_A, customData);

      expect(mockPrisma.problem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timeLimitMs: 5000,
          memoryLimitMb: 512,
        }),
      });
    });
  });

  // =========================================================================
  // AC2: All fields -> saved with PENDING status
  // =========================================================================
  describe("AC2: Problem saved with PENDING status and isActive false", () => {
    it("creates a problem with PENDING approvalStatus and isActive false", async () => {
      const createdProblem = {
        id: "problem-1",
        ...validProblemData,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        isActive: false,
        approvalStatus: ApprovalStatus.PENDING,
        submittedById: USER_A,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.problem.create.mockResolvedValue(createdProblem);

      await submitProblem(USER_A, validProblemData);

      expect(mockPrisma.problem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: false,
          approvalStatus: ApprovalStatus.PENDING,
        }),
      });
    });

    it("sets submittedById to the calling user", async () => {
      const createdProblem = {
        id: "problem-1",
        ...validProblemData,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        isActive: false,
        approvalStatus: ApprovalStatus.PENDING,
        submittedById: USER_A,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.problem.create.mockResolvedValue(createdProblem);

      await submitProblem(USER_A, validProblemData);

      expect(mockPrisma.problem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          submittedById: USER_A,
        }),
      });
    });

    it("sets submittedById to a different user when called by a different user", async () => {
      const otherUser = "user-b-id";
      const createdProblem = {
        id: "problem-2",
        ...validProblemData,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        isActive: false,
        approvalStatus: ApprovalStatus.PENDING,
        submittedById: otherUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.problem.create.mockResolvedValue(createdProblem);

      await submitProblem(otherUser, validProblemData);

      expect(mockPrisma.problem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          submittedById: otherUser,
        }),
      });
    });
  });

  // =========================================================================
  // AC3: Success -> confirmation (the returned object)
  // =========================================================================
  describe("AC3: Success returns the created problem object as confirmation", () => {
    it("returns the created problem object as confirmation", async () => {
      const createdProblem = {
        id: "problem-1",
        title: "Two Sum",
        statement: validProblemData.statement,
        difficulty: "EASY",
        category: "arrays",
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        isActive: false,
        approvalStatus: ApprovalStatus.PENDING,
        submittedById: USER_A,
        createdAt: new Date("2026-04-23T10:00:00Z"),
        updatedAt: new Date("2026-04-23T10:00:00Z"),
      };
      mockPrisma.problem.create.mockResolvedValue(createdProblem);

      const result = await submitProblem(USER_A, validProblemData);

      expect(result).toEqual(createdProblem);
      expect(result.id).toBe("problem-1");
      expect(result.title).toBe("Two Sum");
      expect(result.approvalStatus).toBe(ApprovalStatus.PENDING);
      expect(result.isActive).toBe(false);
      expect(result.submittedById).toBe(USER_A);
    });

    it("returns the object directly from prisma.problem.create", async () => {
      const createdProblem = {
        id: "problem-99",
        title: "Binary Search",
        statement: "Implement binary search...",
        difficulty: "MEDIUM",
        category: "searching",
        timeLimitMs: 3000,
        memoryLimitMb: 128,
        isActive: false,
        approvalStatus: ApprovalStatus.PENDING,
        submittedById: USER_A,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.problem.create.mockResolvedValue(createdProblem);

      const result = await submitProblem(USER_A, {
        title: "Binary Search",
        statement: "Implement binary search...",
        difficulty: "MEDIUM",
        category: "searching",
        timeLimitMs: 3000,
        memoryLimitMb: 128,
      });

      expect(result).toBe(createdProblem);
    });

    it("propagates errors from prisma.problem.create", async () => {
      mockPrisma.problem.create.mockRejectedValue(new Error("DB_ERROR"));

      await expect(submitProblem(USER_A, validProblemData)).rejects.toThrow("DB_ERROR");
    });
  });
});
