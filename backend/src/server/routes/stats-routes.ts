import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import {
  getUserByUsername,
  isAdmin,
  type SafeUser,
} from "../../database";
import {
  createEvaluation,
  getStudentCodeHistory,
  getStudentEvaluations,
  getStudentPerformanceScore,
} from "../../db/evaluation-repo";
import {
  getCategorySuccessRates,
  getHardProblemSolveTimeDistribution,
  getMedianElo,
} from "../../db/stats-repo";
import {
  getTrimmedString,
  parsePositiveInt,
  readJsonBody,
  sendSuccess,
} from "../http-utils";
import { ApiException } from "../types";

/**
 * Public stats routes (no auth required).
 * Called BEFORE requireAuth() in server.ts.
 */
export async function handlePublicStatsRoutes(
  req: IncomingMessage,
  url: URL,
  res: ServerResponse
): Promise<boolean> {
  const method = req.method;

  if (method === "GET" && url.pathname === "/api/stats/solve-times") {
    const distribution = await getHardProblemSolveTimeDistribution();
    sendSuccess(res, 200, distribution);
    return true;
  }

  if (method === "GET" && url.pathname === "/api/stats/category-success") {
    const category = getTrimmedString(url.searchParams.get("category")) || undefined;
    const rates = await getCategorySuccessRates(category);
    sendSuccess(res, 200, rates);
    return true;
  }

  if (method === "GET" && url.pathname === "/api/stats/median-elo") {
    const median = await getMedianElo();
    sendSuccess(res, 200, { medianElo: median });
    return true;
  }

  return false;
}

/**
 * Auth-required stats/evaluation routes.
 * Called AFTER requireAuth() in server.ts.
 */
export async function handleStatsRoutes(
  method: string | undefined,
  url: URL,
  res: ServerResponse,
  currentUser: SafeUser,
  req: IncomingMessage
): Promise<boolean> {
  // GET /api/users/:username/code-history
  const codeHistoryMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/code-history$/
  );
  if (method === "GET" && codeHistoryMatch) {
    const username = decodeURIComponent(codeHistoryMatch[1]);
    const targetUser = await getUserByUsername(username);
    if (!targetUser) {
      throw new ApiException(404, "NOT_FOUND", "user not found.");
    }

    // Admin or the user themselves can view
    const allowed =
      currentUser.isAdmin || currentUser.id === targetUser.id;
    if (!allowed) {
      throw new ApiException(
        403,
        "FORBIDDEN",
        "you do not have access to this user's code history."
      );
    }

    const limit = parsePositiveInt(
      url.searchParams.get("limit"),
      20,
      1,
      100
    );
    const history = await getStudentCodeHistory(targetUser.id, limit);
    sendSuccess(res, 200, history);
    return true;
  }

  // POST /api/evaluations
  if (method === "POST" && url.pathname === "/api/evaluations") {
    // Only admins (instructors) can create evaluations
    const adminCheck = await isAdmin(currentUser.id);
    if (!adminCheck) {
      throw new ApiException(
        403,
        "FORBIDDEN",
        "only instructors/admins can create evaluations."
      );
    }

    const body = await readJsonBody(req);
    const studentUsername = getTrimmedString(body.studentUsername);
    if (!studentUsername) {
      throw new ApiException(
        400,
        "VALIDATION_ERROR",
        "studentUsername is required."
      );
    }

    const student = await getUserByUsername(studentUsername);
    if (!student) {
      throw new ApiException(404, "NOT_FOUND", "student not found.");
    }

    const score =
      typeof body.score === "number" ? Math.floor(body.score) : NaN;
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new ApiException(
        400,
        "VALIDATION_ERROR",
        "score must be an integer between 0 and 100."
      );
    }

    const matchId =
      typeof body.matchId === "string" ? body.matchId.trim() : undefined;
    const feedback =
      typeof body.feedback === "string"
        ? body.feedback.trim().slice(0, 2000)
        : undefined;

    const evaluation = await createEvaluation(currentUser.id, student.id, {
      matchId: matchId || undefined,
      score,
      feedback: feedback || undefined,
    });

    sendSuccess(res, 201, evaluation);
    return true;
  }

  // GET /api/users/:username/evaluations
  const evaluationsMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/evaluations$/
  );
  if (method === "GET" && evaluationsMatch) {
    const username = decodeURIComponent(evaluationsMatch[1]);
    const targetUser = await getUserByUsername(username);
    if (!targetUser) {
      throw new ApiException(404, "NOT_FOUND", "user not found.");
    }

    const evaluations = await getStudentEvaluations(targetUser.id);
    sendSuccess(res, 200, evaluations);
    return true;
  }

  // GET /api/users/:username/performance-score
  const perfScoreMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/performance-score$/
  );
  if (method === "GET" && perfScoreMatch) {
    const username = decodeURIComponent(perfScoreMatch[1]);
    const targetUser = await getUserByUsername(username);
    if (!targetUser) {
      throw new ApiException(404, "NOT_FOUND", "user not found.");
    }

    const score = await getStudentPerformanceScore(targetUser.id);
    sendSuccess(res, 200, { username: targetUser.username, performanceScore: score });
    return true;
  }

  return false;
}
