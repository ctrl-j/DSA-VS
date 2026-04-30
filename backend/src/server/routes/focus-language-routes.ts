import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import {
  recordFocusSession,
  getFocusByDayOfWeek,
  getFocusByCategory,
} from "../../db/focus-repo";
import {
  getLanguageWinLoss,
  getLanguageTestCasesPassed,
  getTopLanguages,
} from "../../db/language-stats-repo";
import { getUserByUsername, type SafeUser } from "../../database";
import { getTrimmedString, readJsonBody, sendSuccess } from "../http-utils";
import { ApiException } from "../types";

export async function handleFocusLanguageRoutes(
  method: string | undefined,
  url: URL,
  res: ServerResponse,
  currentUser: SafeUser,
  req: IncomingMessage
): Promise<boolean> {
  // Record a focus session
  if (method === "POST" && url.pathname === "/api/focus/sessions") {
    const body = await readJsonBody(req);
    const category = getTrimmedString(body.category);
    const durationMs = typeof body.durationMs === "number" ? body.durationMs : 0;

    if (!category) {
      throw new ApiException(400, "VALIDATION_ERROR", "category is required.");
    }
    if (durationMs <= 0 || !Number.isFinite(durationMs)) {
      throw new ApiException(400, "VALIDATION_ERROR", "durationMs must be a positive number.");
    }

    const session = await recordFocusSession(currentUser.id, category, Math.floor(durationMs));
    sendSuccess(res, 201, session);
    return true;
  }

  // Get focus time by day of week
  if (method === "GET" && url.pathname === "/api/focus/weekly") {
    const data = await getFocusByDayOfWeek(currentUser.id);
    sendSuccess(res, 200, data);
    return true;
  }

  // Get focus time by category
  if (method === "GET" && url.pathname === "/api/focus/categories") {
    const data = await getFocusByCategory(currentUser.id);
    sendSuccess(res, 200, data);
    return true;
  }

  // Get current user's language stats (win/loss + test cases)
  if (method === "GET" && url.pathname === "/api/me/language-stats") {
    const [winLoss, testCases] = await Promise.all([
      getLanguageWinLoss(currentUser.id),
      getLanguageTestCasesPassed(currentUser.id),
    ]);

    sendSuccess(res, 200, { winLoss, testCases });
    return true;
  }

  // Get top languages for a user by username
  const languagesMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/languages$/);
  if (method === "GET" && languagesMatch) {
    const username = decodeURIComponent(languagesMatch[1]);
    const targetUser = await getUserByUsername(username);
    if (!targetUser) {
      throw new ApiException(404, "NOT_FOUND", "user not found.");
    }

    const languages = await getTopLanguages(targetUser.id);
    sendSuccess(res, 200, languages);
    return true;
  }

  return false;
}
