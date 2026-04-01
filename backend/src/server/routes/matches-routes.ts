import type { ServerResponse } from "node:http";
import type { URL } from "node:url";
import {
  getLeaderboard,
  getMatchById,
  getMatchHistory,
  type SafeUser,
} from "../../database";
import { getTrimmedString, modeFromQuery, parsePositiveInt, sendSuccess } from "../http-utils";
import { ApiException } from "../types";

export async function handleMatchesRoutes(
  method: string | undefined,
  url: URL,
  res: ServerResponse,
  currentUser: SafeUser
): Promise<boolean> {
  if (method === "GET" && url.pathname === "/api/matches/history") {
    const limit = parsePositiveInt(url.searchParams.get("limit"), 20, 1, 100);
    const offset = parsePositiveInt(url.searchParams.get("offset"), 0, 0, 10000);
    const category = getTrimmedString(url.searchParams.get("category"));
    const mode = modeFromQuery(url.searchParams.get("mode"));

    if (url.searchParams.get("mode") && !mode) {
      throw new ApiException(400, "VALIDATION_ERROR", "mode must be ranked, ffa, or private.");
    }

    const history = await getMatchHistory(
      currentUser.id,
      limit,
      offset,
      category || undefined,
      mode
    );

    sendSuccess(res, 200, history);
    return true;
  }

  if (method === "GET" && /^\/api\/matches\/[^/]+$/.test(url.pathname)) {
    const matchId = url.pathname.split("/")[3] || "";
    const match = await getMatchById(matchId);
    if (!match) {
      throw new ApiException(404, "NOT_FOUND", "match not found.");
    }

    const allowed =
      currentUser.isAdmin || match.participants.some((participant) => participant.userId === currentUser.id);

    if (!allowed) {
      throw new ApiException(403, "FORBIDDEN", "you do not have access to this match.");
    }

    sendSuccess(res, 200, match);
    return true;
  }

  if (method === "GET" && url.pathname === "/api/leaderboard") {
    const limit = parsePositiveInt(url.searchParams.get("limit"), 100, 1, 500);
    const sortByRaw = url.searchParams.get("sortBy") || "elo";
    const sortBy = sortByRaw === "createdAt" ? "createdAt" : "elo";

    const leaderboard = await getLeaderboard(limit, sortBy);
    sendSuccess(res, 200, leaderboard);
    return true;
  }

  return false;
}
