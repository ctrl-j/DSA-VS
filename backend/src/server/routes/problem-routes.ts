import type { ServerResponse } from "node:http";
import type { URL } from "node:url";
import { addTestCase, createProblem, findProblemForMatch, type SafeUser } from "../../database";
import { getTrimmedString, parsePositiveInt, readJsonBody, sendError, sendSuccess } from "../http-utils";
import { ApiException } from "../types";
import { Difficulty } from "@prisma/client";

export async function handleProblemRoutes(
  method: string | undefined,
  url: URL,
  res: ServerResponse,
  currentUser: SafeUser,
  req: any
): Promise<boolean> {
  // Admin only for creation
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
      timeLimitMs: parsePositiveInt(body.timeLimitMs, 2000, 100, 10000),
      memoryLimitMb: parsePositiveInt(body.memoryLimitMb, 256, 16, 1024),
    });

    sendSuccess(res, 201, problem);
    return true;
  }

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

  // Verification for filtering (Task 7)
  if (method === "GET" && url.pathname === "/api/problems/search") {
    const difficulty = getTrimmedString(url.searchParams.get("difficulty")) as Difficulty;
    const category = getTrimmedString(url.searchParams.get("category"));

    // findProblemForMatch is used for finding ONE problem, but for searching we might want more.
    // For now, let's just use it to verify filtering works.
    const problem = await findProblemForMatch(difficulty || undefined, category || undefined);
    
    sendSuccess(res, 200, problem ? [problem] : []);
    return true;
  }

  return false;
}
