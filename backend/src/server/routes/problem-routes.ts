import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import {
  addTestCase,
  createProblem,
  findProblemForMatch,
  type SafeUser,
} from "../../database";
import {
  addTestCaseToSubmission,
  approveSubmission,
  getMySubmissions,
  getPendingSubmissions,
  getSubmissionForEdit,
  rejectSubmission,
  submitProblem,
  updateSubmission,
} from "../../db/problem-submission-repo";
import { getTrimmedString, parsePositiveInt, readJsonBody, sendSuccess } from "../http-utils";
import { ApiException } from "../types";
import { Difficulty } from "@prisma/client";

export async function handleProblemRoutes(
  method: string | undefined,
  url: URL,
  res: ServerResponse,
  currentUser: SafeUser,
  req: IncomingMessage
): Promise<boolean> {

  // ── User: submit a new problem ───────────────────────────────────────
  if (method === "POST" && url.pathname === "/api/problems/submit") {
    const body = await readJsonBody(req);
    const title = getTrimmedString(body.title);
    const statement = getTrimmedString(body.statement);
    const difficulty = getTrimmedString(body.difficulty).toUpperCase();
    const category = getTrimmedString(body.category);

    if (!title || !statement || !difficulty || !category) {
      throw new ApiException(
        400,
        "VALIDATION_ERROR",
        "title, statement, difficulty, and category are required."
      );
    }

    if (!["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
      throw new ApiException(
        400,
        "VALIDATION_ERROR",
        "difficulty must be EASY, MEDIUM, or HARD."
      );
    }

    const problem = await submitProblem(currentUser.id, {
      title,
      statement,
      difficulty: difficulty as Difficulty,
      category,
      timeLimitMs: parsePositiveInt(body.timeLimitMs as string | null, 2000, 100, 10000),
      memoryLimitMb: parsePositiveInt(body.memoryLimitMb as string | null, 256, 16, 1024),
    });

    sendSuccess(res, 201, problem);
    return true;
  }

  // ── User: get my submitted problems ──────────────────────────────────
  if (method === "GET" && url.pathname === "/api/problems/mine") {
    const submissions = await getMySubmissions(currentUser.id);
    sendSuccess(res, 200, submissions);
    return true;
  }

  // ── User: get a problem for editing (owner only, pending only) ───────
  if (method === "GET" && /^\/api\/problems\/[^/]+\/edit$/.test(url.pathname)) {
    const problemId = url.pathname.split("/")[3] || "";
    if (!problemId) {
      throw new ApiException(400, "VALIDATION_ERROR", "problem id is required.");
    }

    try {
      const problem = await getSubmissionForEdit(currentUser.id, problemId);
      sendSuccess(res, 200, problem);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "PROBLEM_NOT_FOUND") {
          throw new ApiException(404, "NOT_FOUND", "problem not found.");
        }
        if (error.message === "FORBIDDEN") {
          throw new ApiException(403, "FORBIDDEN", "you can only edit your own submissions.");
        }
        if (error.message === "PROBLEM_NOT_EDITABLE") {
          throw new ApiException(403, "FORBIDDEN", "only pending problems can be edited.");
        }
      }
      throw error;
    }
  }

  // ── User: update a pending problem (owner only) ──────────────────────
  if (method === "PATCH" && /^\/api\/problems\/[^/]+$/.test(url.pathname)) {
    const problemId = url.pathname.split("/")[3] || "";
    if (!problemId) {
      throw new ApiException(400, "VALIDATION_ERROR", "problem id is required.");
    }

    const body = await readJsonBody(req);
    const updateData: {
      title?: string;
      statement?: string;
      difficulty?: Difficulty;
      category?: string;
      timeLimitMs?: number;
      memoryLimitMb?: number;
    } = {};

    const title = getTrimmedString(body.title);
    if (title) updateData.title = title;

    const statement = getTrimmedString(body.statement);
    if (statement) updateData.statement = statement;

    const difficulty = getTrimmedString(body.difficulty).toUpperCase();
    if (difficulty) {
      if (!["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
        throw new ApiException(
          400,
          "VALIDATION_ERROR",
          "difficulty must be EASY, MEDIUM, or HARD."
        );
      }
      updateData.difficulty = difficulty as Difficulty;
    }

    const category = getTrimmedString(body.category);
    if (category) updateData.category = category;

    if (body.timeLimitMs !== undefined) {
      updateData.timeLimitMs = parsePositiveInt(body.timeLimitMs as string | null, 2000, 100, 10000);
    }

    if (body.memoryLimitMb !== undefined) {
      updateData.memoryLimitMb = parsePositiveInt(body.memoryLimitMb as string | null, 256, 16, 1024);
    }

    try {
      const updated = await updateSubmission(currentUser.id, problemId, updateData);
      sendSuccess(res, 200, updated);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "PROBLEM_NOT_FOUND") {
          throw new ApiException(404, "NOT_FOUND", "problem not found.");
        }
        if (error.message === "FORBIDDEN") {
          throw new ApiException(403, "FORBIDDEN", "you can only edit your own submissions.");
        }
        if (error.message === "PROBLEM_ALREADY_APPROVED") {
          throw new ApiException(403, "FORBIDDEN", "approved problems cannot be edited.");
        }
        if (error.message === "PROBLEM_NOT_EDITABLE") {
          throw new ApiException(403, "FORBIDDEN", "only pending problems can be edited.");
        }
      }
      throw error;
    }
  }

  // ── User: add test case to own pending problem ───────────────────────
  if (method === "POST" && /^\/api\/problems\/[^/]+\/test-cases\/submit$/.test(url.pathname)) {
    const problemId = url.pathname.split("/")[3] || "";
    if (!problemId) {
      throw new ApiException(400, "VALIDATION_ERROR", "problem id is required.");
    }

    const body = await readJsonBody(req);
    const input = typeof body.input === "string" ? body.input : "";
    const expectedOutput = typeof body.expectedOutput === "string" ? body.expectedOutput : "";
    const isHidden = body.isHidden !== false;

    if (!input || !expectedOutput) {
      throw new ApiException(
        400,
        "VALIDATION_ERROR",
        "input and expectedOutput are required."
      );
    }

    const specialCharRe = /[^\x20-\x7E\n\t]/;
    if (specialCharRe.test(input) || specialCharRe.test(expectedOutput)) {
      throw new ApiException(
        400,
        "VALIDATION_ERROR",
        "Special characters are not allowed in test case input or expected output."
      );
    }

    try {
      const testCase = await addTestCaseToSubmission(
        currentUser.id,
        problemId,
        input,
        expectedOutput,
        isHidden
      );
      sendSuccess(res, 201, testCase);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "PROBLEM_NOT_FOUND") {
          throw new ApiException(404, "NOT_FOUND", "problem not found.");
        }
        if (error.message === "FORBIDDEN") {
          throw new ApiException(403, "FORBIDDEN", "you can only add test cases to your own submissions.");
        }
        if (error.message === "PROBLEM_NOT_PENDING") {
          throw new ApiException(403, "FORBIDDEN", "test cases can only be added to pending problems.");
        }
      }
      throw error;
    }
  }

  // ── Admin: list all pending problem submissions ──────────────────────
  if (method === "GET" && url.pathname === "/api/admin/problems/pending") {
    if (!currentUser.isAdmin) {
      throw new ApiException(403, "FORBIDDEN", "admin access required.");
    }

    const pending = await getPendingSubmissions();
    sendSuccess(res, 200, pending);
    return true;
  }

  // ── Admin: approve a problem ─────────────────────────────────────────
  if (method === "POST" && /^\/api\/admin\/problems\/[^/]+\/approve$/.test(url.pathname)) {
    if (!currentUser.isAdmin) {
      throw new ApiException(403, "FORBIDDEN", "admin access required.");
    }

    const problemId = url.pathname.split("/")[4] || "";
    if (!problemId) {
      throw new ApiException(400, "VALIDATION_ERROR", "problem id is required.");
    }

    try {
      const approved = await approveSubmission(problemId);
      sendSuccess(res, 200, approved);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === "PROBLEM_NOT_FOUND") {
        throw new ApiException(404, "NOT_FOUND", "problem not found.");
      }
      throw error;
    }
  }

  // ── Admin: reject a problem with feedback ────────────────────────────
  if (method === "POST" && /^\/api\/admin\/problems\/[^/]+\/reject$/.test(url.pathname)) {
    if (!currentUser.isAdmin) {
      throw new ApiException(403, "FORBIDDEN", "admin access required.");
    }

    const problemId = url.pathname.split("/")[4] || "";
    if (!problemId) {
      throw new ApiException(400, "VALIDATION_ERROR", "problem id is required.");
    }

    const body = await readJsonBody(req);
    const feedback = getTrimmedString(body.feedback);
    if (!feedback) {
      throw new ApiException(400, "VALIDATION_ERROR", "feedback is required when rejecting a problem.");
    }

    try {
      const rejected = await rejectSubmission(problemId, feedback);
      sendSuccess(res, 200, rejected);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === "PROBLEM_NOT_FOUND") {
        throw new ApiException(404, "NOT_FOUND", "problem not found.");
      }
      throw error;
    }
  }

  // ── Admin: create problem directly (existing route) ──────────────────
  if (method === "POST" && url.pathname === "/api/problems") {
    if (!currentUser.isAdmin) {
      throw new ApiException(403, "FORBIDDEN", "Only admins can create problems.");
    }

    const body = await readJsonBody(req);
    const title = getTrimmedString(body.title);
    const statement = getTrimmedString(body.statement);
    const difficulty = getTrimmedString(body.difficulty) as Difficulty;
    const category = getTrimmedString(body.category);

    if (!title || !statement || !difficulty || !category) {
      throw new ApiException(400, "VALIDATION_ERROR", "title, statement, difficulty, and category are required.");
    }

    const problem = await createProblem({
      title,
      statement,
      difficulty,
      category,
      timeLimitMs: parsePositiveInt(body.timeLimitMs as string | null, 2000, 100, 10000),
      memoryLimitMb: parsePositiveInt(body.memoryLimitMb as string | null, 256, 16, 1024),
    });

    sendSuccess(res, 201, problem);
    return true;
  }

  // ── Admin: add test case directly (existing route) ───────────────────
  if (method === "POST" && /^\/api\/problems\/[^/]+\/test-cases$/.test(url.pathname)) {
    if (!currentUser.isAdmin) {
      throw new ApiException(403, "FORBIDDEN", "Only admins can add test cases.");
    }

    const problemId = url.pathname.split("/")[3] || "";
    const body = await readJsonBody(req);
    const input = typeof body.input === "string" ? body.input : "";
    const expectedOutput = typeof body.expectedOutput === "string" ? body.expectedOutput : "";
    const isHidden = body.isHidden !== false;

    const testCase = await addTestCase(problemId, input, expectedOutput, isHidden);
    sendSuccess(res, 201, testCase);
    return true;
  }

  // ── Search/filter problems (existing route) ──────────────────────────
  if (method === "GET" && url.pathname === "/api/problems/search") {
    const difficulty = getTrimmedString(url.searchParams.get("difficulty")) as Difficulty;
    const category = getTrimmedString(url.searchParams.get("category"));

    const problem = await findProblemForMatch(difficulty || undefined, category || undefined);

    sendSuccess(res, 200, problem ? [problem] : []);
    return true;
  }

  return false;
}
