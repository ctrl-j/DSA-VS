import { ReportStatus } from "@prisma/client";
import { prisma } from "./client";

export async function reportUser(reporterId: string, reportedId: string, reason: string) {
  if (reporterId === reportedId) {
    throw new Error("CANNOT_REPORT_SELF");
  }

  return prisma.report.create({
    data: {
      reporterId,
      reportedId,
      reason,
      status: ReportStatus.OPEN,
    },
  });
}

export async function createBugReport(
  reporterId: string | null,
  title: string,
  description: string
) {
  return prisma.bugReport.create({
    data: {
      reporterId,
      title,
      description,
    },
  });
}
