import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import {
  createBugReport,
  getChatsBetweenUsers,
  isAdmin,
  reportUser,
  type SafeUser,
} from "../../database";
import { getTrimmedString, readJsonBody, sendSuccess } from "../http-utils";
import { ApiException } from "../types";

export async function handleReportsAdminRoutes(
  method: string | undefined,
  url: URL,
  res: ServerResponse,
  currentUser: SafeUser,
  req: IncomingMessage
): Promise<boolean> {
  if (method === "POST" && url.pathname === "/api/reports/users") {
    const body = await readJsonBody(req);
    const reportedId = getTrimmedString(body.reportedId);
    const reason = getTrimmedString(body.reason).slice(0, 500);
    if (!reportedId || !reason) {
      throw new ApiException(400, "VALIDATION_ERROR", "reportedId and reason are required.");
    }

    const report = await reportUser(currentUser.id, reportedId, reason);
    sendSuccess(res, 201, report);
    return true;
  }

  if (method === "POST" && url.pathname === "/api/reports/bugs") {
    const body = await readJsonBody(req);
    const title = getTrimmedString(body.title).slice(0, 150);
    const description = getTrimmedString(body.description).slice(0, 5000);
    if (!title || !description) {
      throw new ApiException(400, "VALIDATION_ERROR", "title and description are required.");
    }

    const bugReport = await createBugReport(currentUser.id, title, description);
    sendSuccess(res, 201, bugReport);
    return true;
  }

  if (method === "GET" && url.pathname === "/api/admin/chats") {
    const admin = await isAdmin(currentUser.id);
    if (!admin) {
      throw new ApiException(403, "FORBIDDEN", "admin access required.");
    }

    const userId1 = getTrimmedString(url.searchParams.get("userId1"));
    const userId2 = getTrimmedString(url.searchParams.get("userId2"));
    if (!userId1 || !userId2) {
      throw new ApiException(400, "VALIDATION_ERROR", "userId1 and userId2 are required.");
    }

    const chats = await getChatsBetweenUsers(userId1, userId2);
    sendSuccess(res, 200, chats);
    return true;
  }

  return false;
}
