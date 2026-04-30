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

import {
  addTestCaseToSubmission,
  getTestCaseCount,
  sanitizeTestData,
} from "../db/problem-submission-repo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const USER_A = "user-a-id";
const USER_B = "user-b-id";
const PROBLEM_ID = "problem-1";

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ===========================================================================
// Sprint 3 User Story 5 - Submit Test Cases
// Story: Submit individual test cases for a given problem.
// ===========================================================================
describe("Sprint 3 User Story 5 - Submit Test Cases", () => {
  // =========================================================================
  // AC1: Input and output saved as a single test unit
  // =========================================================================
  describe("AC1: Input and output saved as a single test unit", () => {
    it("saves input and output as a test case linked to the problem", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        submittedById: USER_A,
        approvalStatus: ApprovalStatus.PENDING,
      });
      mockPrisma.testCase.create.mockResolvedValue({
        id: "tc-1",
        problemId: PROBLEM_ID,
        input: "[[2,7,11,15],9]",
        expectedOutput: "[0,1]",
        isHidden: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await addTestCaseToSubmission(
        USER_A,
        PROBLEM_ID,
        "[[2,7,11,15],9]",
        "[0,1]",
        false
      );

      expect(mockPrisma.testCase.create).toHaveBeenCalledWith({
        data: {
          problemId: PROBLEM_ID,
          input: "[[2,7,11,15],9]",
          expectedOutput: "[0,1]",
          isHidden: false,
        },
      });
      expect(result.id).toBe("tc-1");
      expect(result.problemId).toBe(PROBLEM_ID);
    });

    it("verifies problem belongs to user before adding test case", async () => {
      // Problem belongs to USER_B, not USER_A
      mockPrisma.problem.findUnique.mockResolvedValue({
        submittedById: USER_B,
        approvalStatus: ApprovalStatus.PENDING,
      });

      await expect(
        addTestCaseToSubmission(USER_A, PROBLEM_ID, "[1,2,3]", "[3]", true)
      ).rejects.toThrow("FORBIDDEN");

      expect(mockPrisma.testCase.create).not.toHaveBeenCalled();
    });

    it("throws PROBLEM_NOT_FOUND when problem does not exist", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue(null);

      await expect(
        addTestCaseToSubmission(USER_A, "nonexistent", "[1]", "[1]", true)
      ).rejects.toThrow("PROBLEM_NOT_FOUND");

      expect(mockPrisma.testCase.create).not.toHaveBeenCalled();
    });

    it("throws PROBLEM_NOT_PENDING when problem is already approved", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        submittedById: USER_A,
        approvalStatus: ApprovalStatus.APPROVED,
      });

      await expect(
        addTestCaseToSubmission(USER_A, PROBLEM_ID, "[1]", "[1]", true)
      ).rejects.toThrow("PROBLEM_NOT_PENDING");

      expect(mockPrisma.testCase.create).not.toHaveBeenCalled();
    });

    it("supports hidden and visible test cases via isHidden flag", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        submittedById: USER_A,
        approvalStatus: ApprovalStatus.PENDING,
      });
      mockPrisma.testCase.create.mockResolvedValue({
        id: "tc-2",
        problemId: PROBLEM_ID,
        input: "[5,10]",
        expectedOutput: "15",
        isHidden: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await addTestCaseToSubmission(USER_A, PROBLEM_ID, "[5,10]", "15", true);

      expect(mockPrisma.testCase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isHidden: true,
        }),
      });
    });
  });

  // =========================================================================
  // AC2: View test case count
  // =========================================================================
  describe("AC2: View test case count", () => {
    it("returns the count of test cases for a problem", async () => {
      mockPrisma.testCase.count.mockResolvedValue(7);

      const count = await getTestCaseCount(PROBLEM_ID);

      expect(count).toBe(7);
      expect(mockPrisma.testCase.count).toHaveBeenCalledWith({
        where: { problemId: PROBLEM_ID },
      });
    });

    it("returns 0 when problem has no test cases", async () => {
      mockPrisma.testCase.count.mockResolvedValue(0);

      const count = await getTestCaseCount(PROBLEM_ID);

      expect(count).toBe(0);
    });

    it("queries with the correct problemId", async () => {
      const otherId = "problem-other";
      mockPrisma.testCase.count.mockResolvedValue(3);

      await getTestCaseCount(otherId);

      expect(mockPrisma.testCase.count).toHaveBeenCalledWith({
        where: { problemId: otherId },
      });
    });
  });

  // =========================================================================
  // AC3: Special characters sanitized
  // =========================================================================
  describe("AC3: Special characters sanitized", () => {
    it("strips null bytes from test data", () => {
      const result = sanitizeTestData("hello\0world\0");
      expect(result).toBe("helloworld");
    });

    it("normalizes CRLF line endings to LF", () => {
      const result = sanitizeTestData("line1\r\nline2\r\nline3");
      expect(result).toBe("line1\nline2\nline3");
    });

    it("normalizes lone CR line endings to LF", () => {
      const result = sanitizeTestData("line1\rline2\rline3");
      expect(result).toBe("line1\nline2\nline3");
    });

    it("trims leading and trailing whitespace", () => {
      const result = sanitizeTestData("  hello world  \n  ");
      expect(result).toBe("hello world");
    });

    it("handles combined null bytes, CRLF, and whitespace", () => {
      const result = sanitizeTestData("  \0hello\r\nworld\0  ");
      expect(result).toBe("hello\nworld");
    });

    it("returns empty string for whitespace-only input", () => {
      const result = sanitizeTestData("   \n\r\n  ");
      expect(result).toBe("");
    });

    it("sanitizes input and output when adding a test case", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        submittedById: USER_A,
        approvalStatus: ApprovalStatus.PENDING,
      });
      mockPrisma.testCase.create.mockResolvedValue({
        id: "tc-3",
        problemId: PROBLEM_ID,
        input: "[1,2,3]",
        expectedOutput: "[3,2,1]",
        isHidden: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await addTestCaseToSubmission(
        USER_A,
        PROBLEM_ID,
        "  [1,2,3]\r\n  ",        // has whitespace and CRLF
        "  \0[3,2,1]\r\n  ",      // has null byte, whitespace, and CRLF
        false
      );

      expect(mockPrisma.testCase.create).toHaveBeenCalledWith({
        data: {
          problemId: PROBLEM_ID,
          input: "[1,2,3]",          // trimmed and normalized
          expectedOutput: "[3,2,1]", // null byte stripped, trimmed, normalized
          isHidden: false,
        },
      });
    });

    it("sanitizes both input and output independently", async () => {
      mockPrisma.problem.findUnique.mockResolvedValue({
        submittedById: USER_A,
        approvalStatus: ApprovalStatus.PENDING,
      });
      mockPrisma.testCase.create.mockResolvedValue({
        id: "tc-4",
        problemId: PROBLEM_ID,
        input: "line1\nline2",
        expectedOutput: "result",
        isHidden: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await addTestCaseToSubmission(
        USER_A,
        PROBLEM_ID,
        "line1\r\nline2",   // CRLF in input
        "  result  ",        // whitespace in output
        true
      );

      expect(mockPrisma.testCase.create).toHaveBeenCalledWith({
        data: {
          problemId: PROBLEM_ID,
          input: "line1\nline2",     // CRLF normalized to LF
          expectedOutput: "result",  // trimmed
          isHidden: true,
        },
      });
    });
  });
});
