import { apiRequest } from "../../services/api/client";
import { AdminChatMessage, AdminUserReport, BugReport } from "../../types/models";

export function getAdminChats(token: string, username1: string, username2: string) {
  return apiRequest<AdminChatMessage[]>('/api/admin/chats', {
    token,
    query: { username1, username2 },
  });
}

export function getAdminBugReports(token: string) {
  return apiRequest<BugReport[]>('/api/admin/bug-reports', { token });
}

export function getAdminUserReports(token: string) {
  return apiRequest<AdminUserReport[]>('/api/admin/reports/users', {
    token,
    query: { status: 'OPEN' },
  });
}

export function banByReport(token: string, reportId: string) {
  return apiRequest<{ user: { id: string; isBanned: boolean } }>(
    `/api/admin/reports/users/${reportId}/ban`,
    {
      method: 'POST',
      token,
      body: { actionTaken: 'banned by admin via frontend' },
    }
  );
}
