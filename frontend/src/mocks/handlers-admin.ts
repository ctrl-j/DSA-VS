import { http, HttpResponse } from "msw";
import { db } from "./mock-db";

function ok(data: unknown, status = 200) {
  return HttpResponse.json({ ok: true, data }, { status });
}

function fail(status: number, code: string, message: string) {
  return HttpResponse.json({ ok: false, error: { code, message } }, { status });
}

function tokenOf(request: Request) {
  const raw = request.headers.get("Authorization") ?? "";
  return raw.replace("Bearer ", "").trim() || null;
}

function currentUser(request: Request) {
  return db.sessionUser(tokenOf(request));
}

let counter = 1000;
const id = (prefix: string) => `${prefix}${counter++}`;

export const adminHandlers = [
  http.post("http://localhost:3000/api/reports/users", async ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const body = (await request.json()) as { reportedUsername: string; reason: string };
    db.reports.push({
      id: id("r"),
      reporterUsername: user.username,
      reportedUsername: body.reportedUsername,
      reason: body.reason,
      status: "OPEN",
    });
    return ok({ id: db.reports[db.reports.length - 1].id }, 201);
  }),
  http.post("http://localhost:3000/api/reports/bugs", async ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const body = (await request.json()) as { title: string; description: string };
    db.bugReports.push({ id: id("bug"), title: body.title, description: body.description, createdAt: new Date().toISOString() });
    return ok({ id: db.bugReports[db.bugReports.length - 1].id }, 201);
  }),
  http.get("http://localhost:3000/api/admin/chats", ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    if (!user.isAdmin) return fail(403, "FORBIDDEN", "admin access required.");
    const url = new URL(request.url);
    const a = url.searchParams.get("username1") || "";
    const b = url.searchParams.get("username2") || "";
    const rows = db.messages.filter((m) => (m.sender === a && m.receiver === b) || (m.sender === b && m.receiver === a)).map((m) => ({ id: m.id, senderId: m.sender, receiverId: m.receiver, content: m.content, createdAt: m.createdAt, sender: { id: db.user(m.sender)!.id, username: m.sender }, receiver: { id: db.user(m.receiver)!.id, username: m.receiver } }));
    return ok(rows);
  }),
  http.get("http://localhost:3000/api/admin/bug-reports", ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    if (!user.isAdmin) return fail(403, "FORBIDDEN", "admin access required.");
    return ok(db.bugReports);
  }),
  http.get("http://localhost:3000/api/admin/reports/users", ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    if (!user.isAdmin) return fail(403, "FORBIDDEN", "admin access required.");
    return ok(db.reports.map((report) => ({ id: report.id, reason: report.reason, status: report.status, reporter: { id: db.user(report.reporterUsername)!.id, username: report.reporterUsername }, reported: { id: db.user(report.reportedUsername)!.id, username: report.reportedUsername } })));
  }),
  http.post("http://localhost:3000/api/admin/reports/users/:reportId/ban", ({ request, params }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    if (!user.isAdmin) return fail(403, "FORBIDDEN", "admin access required.");
    const report = db.reports.find((item) => item.id === String(params.reportId));
    if (!report) return fail(404, "NOT_FOUND", "report not found.");
    const target = db.user(report.reportedUsername);
    if (!target) return fail(404, "NOT_FOUND", "reported user not found.");
    report.status = "CLOSED";
    report.actionTaken = `banned by admin (${user.username})`;
    target.isBanned = true;
    return ok({ user: { id: target.id, username: target.username, isBanned: true }, report });
  }),
];
