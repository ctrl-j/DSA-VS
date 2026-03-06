import { apiRequest } from "../../services/api/client";
import { BugReportInput, UserReportInput } from "../../types/models";

export function submitUserReport(token: string, input: UserReportInput) {
  return apiRequest<{ id: string }>("/api/reports/users", {
    method: "POST",
    token,
    body: input,
  });
}

export function submitBugReport(token: string, input: BugReportInput) {
  return apiRequest<{ id: string }>("/api/reports/bugs", {
    method: "POST",
    token,
    body: input,
  });
}
