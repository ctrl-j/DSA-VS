import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import { ReportStatus } from "@prisma/client";
import {
  banUserFromReport,
  createBugReport,
  getBugReports,
  getChatsBetweenUsers,
  getUserByUsername,
  getUserReports,
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
  async function requireAdminAccess() {
    const admin = await isAdmin(currentUser.id);
    if (!admin) {
      throw new ApiException(403, "FORBIDDEN", "admin access required.");
    }
  }

  if (method === "POST" && url.pathname === "/api/reports/users") {
    const body = await readJsonBody(req);
    const reportedUsername = getTrimmedString(body.reportedUsername);
    const reason = getTrimmedString(body.reason).slice(0, 500);
    if (!reportedUsername || !reason) {
      throw new ApiException(400, "VALIDATION_ERROR", "reportedUsername and reason are required.");
    }

    const reported = await getUserByUsername(reportedUsername);
    if (!reported) {
      throw new ApiException(404, "NOT_FOUND", "reported user not found.");
    }

    const reportedId = reported.id;
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
    await requireAdminAccess();

    const username1 = getTrimmedString(url.searchParams.get("username1"));
    const username2 = getTrimmedString(url.searchParams.get("username2"));
    if (!username1 || !username2) {
      throw new ApiException(400, "VALIDATION_ERROR", "username1 and username2 are required.");
    }

    const user1 = await getUserByUsername(username1);
    const user2 = await getUserByUsername(username2);
    if (!user1 || !user2) {
      throw new ApiException(404, "NOT_FOUND", "one or more users not found.");
    }

    const userId1 = user1.id;
    const userId2 = user2.id;
    const chats = await getChatsBetweenUsers(userId1, userId2);
    sendSuccess(res, 200, chats);
    return true;
  }

  if (method === "GET" && url.pathname === "/api/admin/bug-reports") {
    await requireAdminAccess();
    const limitRaw = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(Math.floor(limitRaw), 500)) : 100;
    const bugReports = await getBugReports(limit);
    sendSuccess(res, 200, bugReports);
    return true;
  }

  if (method === "GET" && url.pathname === "/api/admin/reports/users") {
    await requireAdminAccess();
    const statusRaw = getTrimmedString(url.searchParams.get("status")).toUpperCase();
    let status: ReportStatus | undefined;
    if (statusRaw) {
      if (statusRaw !== "OPEN" && statusRaw !== "CLOSED") {
        throw new ApiException(400, "VALIDATION_ERROR", "status must be OPEN or CLOSED.");
      }
      status = statusRaw as ReportStatus;
    }
    const limitRaw = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(Math.floor(limitRaw), 500)) : 100;
    const reports = await getUserReports(status, limit);
    sendSuccess(res, 200, reports);
    return true;
  }

  if (method === "POST" && /^\/api\/admin\/reports\/users\/[^/]+\/ban$/.test(url.pathname)) {
    await requireAdminAccess();
    const reportId = url.pathname.split("/")[5] || "";
    if (!reportId) {
      throw new ApiException(400, "VALIDATION_ERROR", "report id is required.");
    }

    const body = await readJsonBody(req);
    const actionTaken = getTrimmedString(body.actionTaken) || "banned by admin";

    try {
      const result = await banUserFromReport(reportId, currentUser.id, actionTaken);
      sendSuccess(res, 200, result);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === "REPORT_NOT_FOUND") {
        throw new ApiException(404, "NOT_FOUND", "report not found.");
      }
      throw error;
    }
  }

  return false;
}
