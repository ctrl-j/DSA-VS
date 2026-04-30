import { describe, it, expect, beforeEach, jest, afterAll } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mock Prisma client (CJS-style) before any imports that use it
// ---------------------------------------------------------------------------
const mockPrisma = {
  submission: {
    findMany: jest.fn<any>(),
  },
  instructorEvaluation: {
    create: jest.fn<any>(),
    findMany: jest.fn<any>(),
    aggregate: jest.fn<any>(),
  },
  user: {
    findUnique: jest.fn<any>(),
  },
  match: {
    findUnique: jest.fn<any>(),
  },
  $disconnect: jest.fn<any>(),
};

jest.mock("../db/client", () => ({ prisma: mockPrisma }));

import {
  getStudentCodeHistory,
  createEvaluation,
  getStudentPerformanceScore,
} from "../db/evaluation-repo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STUDENT_ID = "student-1";
const INSTRUCTOR_ID = "instructor-1";

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    language: "python",
    code: 'class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for i, n in enumerate(nums):\n            if target - n in seen:\n                return [seen[target - n], i]\n            seen[n] = i',
    passedCount: 5,
    status: "COMPLETED",
    createdAt: new Date("2026-04-20T14:00:00Z"),
    match: {
      id: "match-1",
      mode: "RANKED",
      startedAt: new Date("2026-04-20T13:50:00Z"),
      endedAt: new Date("2026-04-20T14:10:00Z"),
      durationSec: 1200,
      problem: {
        id: "prob-1",
        title: "Two Sum",
        difficulty: "EASY",
        category: "arrays",
      },
    },
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
// Sprint 3 User Story 8 — Evaluate Student Performance Without AI
// ===========================================================================
describe("Sprint 3 User Story 8 - Evaluate Student Performance", () => {
  // -------------------------------------------------------------------------
  // AC1: View student code history (getStudentCodeHistory)
  // -------------------------------------------------------------------------
  describe("AC1: View student code history", () => {
    it("returns submissions with code, language, and match details", async () => {
      const submissions = [
        makeSubmission(),
        makeSubmission({
          id: "sub-2",
          language: "cpp",
          code: '#include <vector>\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {};\n    }\n};',
        }),
      ];
      mockPrisma.submission.findMany.mockResolvedValue(submissions);

      const result = await getStudentCodeHistory(STUDENT_ID);

      expect(result).toHaveLength(2);
      expect(result[0].code).toBeDefined();
      expect(result[0].language).toBe("python");
      expect(result[0].match).toBeDefined();
      const match = result[0].match as NonNullable<typeof result[0]["match"]>;
      const problem = match.problem as NonNullable<typeof match.problem>;
      expect(problem.title).toBe("Two Sum");
      expect(result[1].language).toBe("cpp");
    });

    it("filters to completed matches only", async () => {
      mockPrisma.submission.findMany.mockResolvedValue([]);

      await getStudentCodeHistory(STUDENT_ID);

      expect(mockPrisma.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: STUDENT_ID,
            match: expect.objectContaining({
              status: "COMPLETED",
            }),
          }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // AC2: Raw code only, no AI hints
  // -------------------------------------------------------------------------
  describe("AC2: Raw student code without AI-generated content", () => {
    it("returns raw student code without AI-generated content", async () => {
      const rawCode =
        'class Solution:\n    def twoSum(self, nums, target):\n        for i in range(len(nums)):\n            for j in range(i+1, len(nums)):\n                if nums[i] + nums[j] == target:\n                    return [i, j]';
      mockPrisma.submission.findMany.mockResolvedValue([
        makeSubmission({ code: rawCode }),
      ]);

      const result = await getStudentCodeHistory(STUDENT_ID);

      expect(result[0].code).toBe(rawCode);
      // The code field is exactly what the student submitted — no AI hints,
      // suggestions, or generated annotations are appended.
      expect(result[0].code).not.toContain("AI");
      expect(result[0].code).not.toContain("hint");
      expect(typeof result[0].code).toBe("string");
    });
  });

  // -------------------------------------------------------------------------
  // AC3: Performance score based on instructor input
  // -------------------------------------------------------------------------
  describe("AC3: Performance score from instructor evaluations", () => {
    it("creates an evaluation with instructor score", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: STUDENT_ID,
      });
      mockPrisma.instructorEvaluation.create.mockResolvedValue({
        id: "eval-1",
        instructorId: INSTRUCTOR_ID,
        studentId: STUDENT_ID,
        matchId: null,
        score: 85,
        feedback: "Good use of hash map",
        createdAt: new Date(),
        instructor: { id: INSTRUCTOR_ID, username: "profSmith" },
        student: { id: STUDENT_ID, username: "studentA" },
      });

      const result = await createEvaluation(INSTRUCTOR_ID, STUDENT_ID, {
        score: 85,
        feedback: "Good use of hash map",
      });

      expect(result.score).toBe(85);
      expect(result.feedback).toBe("Good use of hash map");
      expect(result.instructor.username).toBe("profSmith");
      expect(result.student.username).toBe("studentA");
      expect(mockPrisma.instructorEvaluation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            instructorId: INSTRUCTOR_ID,
            studentId: STUDENT_ID,
            score: 85,
            feedback: "Good use of hash map",
          }),
        })
      );
    });

    it("rejects scores outside 0-100 range", async () => {
      await expect(
        createEvaluation(INSTRUCTOR_ID, STUDENT_ID, { score: 101 })
      ).rejects.toThrow("INVALID_SCORE");

      await expect(
        createEvaluation(INSTRUCTOR_ID, STUDENT_ID, { score: -1 })
      ).rejects.toThrow("INVALID_SCORE");

      // Prisma should never be called for invalid scores
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.instructorEvaluation.create).not.toHaveBeenCalled();
    });

    it("calculates average performance score from evaluations", async () => {
      mockPrisma.instructorEvaluation.aggregate.mockResolvedValue({
        _avg: { score: 82 },
        _count: { id: 4 },
      });

      const result = await getStudentPerformanceScore(STUDENT_ID);

      expect(result).toBe(82);
      expect(mockPrisma.instructorEvaluation.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: STUDENT_ID },
          _avg: { score: true },
          _count: { id: true },
        })
      );
    });

    it("returns null when no evaluations exist", async () => {
      mockPrisma.instructorEvaluation.aggregate.mockResolvedValue({
        _avg: { score: null },
        _count: { id: 0 },
      });

      const result = await getStudentPerformanceScore(STUDENT_ID);

      expect(result).toBeNull();
    });
  });
});
