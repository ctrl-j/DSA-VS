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

export async function getBugReports(limit = 100) {
  return prisma.bugReport.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(limit, 500)),
  });
}

export async function getUserReports(status?: ReportStatus, limit = 100) {
  return prisma.report.findMany({
    where: status ? { status } : undefined,
    include: {
      reporter: { select: { id: true, username: true } },
      reported: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(limit, 500)),
  });
}

export async function banUserFromReport(
  reportId: string,
  adminUserId: string,
  actionTaken = "banned by admin"
) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, reportedId: true, status: true },
  });

  if (!report) {
    throw new Error("REPORT_NOT_FOUND");
  }

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: report.reportedId },
      data: { isBanned: true },
      select: { id: true, username: true, isBanned: true },
    });

    const updatedReport = await tx.report.update({
      where: { id: report.id },
      data: {
        status: ReportStatus.CLOSED,
        actionTaken: `${actionTaken} (admin:${adminUserId})`,
      },
    });

    await tx.session.deleteMany({
      where: { userId: report.reportedId },
    });

    return { user: updatedUser, report: updatedReport };
  });
}
