import { ApprovalStatus, type Difficulty } from "@prisma/client";
import { prisma } from "./client";

/**
 * Sanitize test case data: trim whitespace, normalize line endings,
 * strip null bytes, and remove non-ASCII special characters.
 */
export function sanitizeTestData(data: string): string {
  return data
    .replace(/\0/g, "")           // strip null bytes
    .replace(/\r\n/g, "\n")       // normalize CRLF → LF
    .replace(/\r/g, "\n")         // normalize lone CR → LF
    .replace(/[^\x20-\x7E\n\t]/g, "")  // strip non-printable / special chars
    .trim();
}

/**
 * Submit a new problem (any authenticated user).
 * Created with approvalStatus PENDING, isActive false.
 */
export async function submitProblem(
  userId: string,
  data: {
    title: string;
    statement: string;
    difficulty: Difficulty;
    category: string;
    timeLimitMs?: number;
    memoryLimitMb?: number;
  }
) {
  return prisma.problem.create({
    data: {
      title: data.title,
      statement: data.statement,
      difficulty: data.difficulty,
      category: data.category,
      timeLimitMs: data.timeLimitMs ?? 2000,
      memoryLimitMb: data.memoryLimitMb ?? 256,
      isActive: false,
      approvalStatus: ApprovalStatus.PENDING,
      submittedById: userId,
    },
  });
}

/**
 * Add a test case to a user's own pending problem.
 * Verifies ownership and PENDING status before creating.
 */
export async function addTestCaseToSubmission(
  userId: string,
  problemId: string,
  input: string,
  expectedOutput: string,
  isHidden: boolean
) {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { submittedById: true, approvalStatus: true },
  });

  if (!problem) {
    throw new Error("PROBLEM_NOT_FOUND");
  }

  if (problem.submittedById !== userId) {
    throw new Error("FORBIDDEN");
  }

  if (problem.approvalStatus !== ApprovalStatus.PENDING) {
    throw new Error("PROBLEM_NOT_PENDING");
  }

  const sanitizedInput = sanitizeTestData(input);
  const sanitizedOutput = sanitizeTestData(expectedOutput);

  return prisma.testCase.create({
    data: {
      problemId,
      input: sanitizedInput,
      expectedOutput: sanitizedOutput,
      isHidden,
    },
  });
}

/**
 * Get the number of test cases for a problem.
 */
export async function getTestCaseCount(problemId: string): Promise<number> {
  return prisma.testCase.count({
    where: { problemId },
  });
}

/**
 * Get all problems submitted by a user, with test case counts.
 */
export async function getMySubmissions(userId: string) {
  return prisma.problem.findMany({
    where: { submittedById: userId },
    include: {
      _count: {
        select: { testCases: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a specific problem for editing.
 * Only returns if owned by the user and status is PENDING.
 */
export async function getSubmissionForEdit(userId: string, problemId: string) {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: {
      testCases: true,
      _count: {
        select: { testCases: true },
      },
    },
  });

  if (!problem) {
    throw new Error("PROBLEM_NOT_FOUND");
  }

  if (problem.submittedById !== userId) {
    throw new Error("FORBIDDEN");
  }

  if (problem.approvalStatus !== ApprovalStatus.PENDING) {
    throw new Error("PROBLEM_NOT_EDITABLE");
  }

  return problem;
}

/**
 * Update a pending problem. Verifies ownership and PENDING status.
 * If the problem is APPROVED, throws an error (edit disabled).
 */
export async function updateSubmission(
  userId: string,
  problemId: string,
  data: {
    title?: string;
    statement?: string;
    difficulty?: Difficulty;
    category?: string;
    timeLimitMs?: number;
    memoryLimitMb?: number;
  }
) {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { submittedById: true, approvalStatus: true },
  });

  if (!problem) {
    throw new Error("PROBLEM_NOT_FOUND");
  }

  if (problem.submittedById !== userId) {
    throw new Error("FORBIDDEN");
  }

  if (problem.approvalStatus === ApprovalStatus.APPROVED) {
    throw new Error("PROBLEM_ALREADY_APPROVED");
  }

  if (problem.approvalStatus !== ApprovalStatus.PENDING) {
    throw new Error("PROBLEM_NOT_EDITABLE");
  }

  // Build update data, only including fields that are provided
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.statement !== undefined) updateData.statement = data.statement;
  if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.timeLimitMs !== undefined) updateData.timeLimitMs = data.timeLimitMs;
  if (data.memoryLimitMb !== undefined) updateData.memoryLimitMb = data.memoryLimitMb;

  return prisma.problem.update({
    where: { id: problemId },
    data: updateData,
  });
}

/**
 * Admin: get all problems with PENDING approval status.
 */
export async function getPendingSubmissions() {
  return prisma.problem.findMany({
    where: { approvalStatus: ApprovalStatus.PENDING },
    include: {
      submittedBy: {
        select: { id: true, username: true },
      },
      _count: {
        select: { testCases: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Admin: approve a problem — sets approvalStatus to APPROVED and isActive to true.
 */
export async function approveSubmission(problemId: string) {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { id: true, approvalStatus: true },
  });

  if (!problem) {
    throw new Error("PROBLEM_NOT_FOUND");
  }

  return prisma.problem.update({
    where: { id: problemId },
    data: {
      approvalStatus: ApprovalStatus.APPROVED,
      isActive: true,
    },
  });
}

/**
 * Admin: reject a problem with feedback.
 */
export async function rejectSubmission(problemId: string, feedback: string) {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { id: true, approvalStatus: true },
  });

  if (!problem) {
    throw new Error("PROBLEM_NOT_FOUND");
  }

  return prisma.problem.update({
    where: { id: problemId },
    data: {
      approvalStatus: ApprovalStatus.REJECTED,
      rejectionFeedback: feedback,
      isActive: false,
    },
  });
}
