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

let counter = 100;
const id = (prefix: string) => `${prefix}${counter++}`;

export const userHandlers = [
  http.post("http://localhost:3000/api/auth/register", async ({ request }) => {
    const { username, password } = (await request.json()) as Record<string, string>;
    if (!username || !password || password.length < 8) return fail(400, "VALIDATION_ERROR", "invalid input");
    if (db.user(username)) return fail(409, "CONFLICT", "username is already taken.");
    const user = { id: id("u"), username, password, elo: 1200, isAdmin: false, isBanned: false, profile: { bio: "", avatarUrl: "" } };
    db.users.push(user);
    return ok({ userId: user.id, username: user.username, elo: user.elo }, 201);
  }),
  http.post("http://localhost:3000/api/auth/login", async ({ request }) => {
    const { username, password } = (await request.json()) as Record<string, string>;
    const user = db.user(username || "");
    if (!user || user.password !== password) return fail(401, "UNAUTHORIZED", "Invalid username or password.");
    if (!db.canLogin(user)) return fail(403, "FORBIDDEN", "This account is banned.");
    const token = `token-${user.username}`;
    db.sessions.set(token, user.username);
    return ok({ token, user: { id: user.id, username: user.username, elo: user.elo, isAdmin: user.isAdmin }, expiresAt: new Date().toISOString() });
  }),
  http.post("http://localhost:3000/api/auth/logout", ({ request }) => {
    const token = tokenOf(request);
    if (token) db.sessions.delete(token);
    return ok({ loggedOut: true });
  }),
  http.get("http://localhost:3000/api/me", ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    return ok({ id: user.id, username: user.username, elo: user.elo, isAdmin: user.isAdmin, profile: user.profile });
  }),
  http.patch("http://localhost:3000/api/me/password", async ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const body = (await request.json()) as Record<string, string>;
    if (body.oldPassword !== user.password) return fail(400, "VALIDATION_ERROR", "current password is incorrect.");
    user.password = body.newPassword;
    return ok({ updated: true });
  }),
  http.patch("http://localhost:3000/api/me/profile", async ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const body = (await request.json()) as Record<string, string>;
    if (body.avatarUrl && !/^https?:\/\//.test(body.avatarUrl)) return fail(400, "VALIDATION_ERROR", "avatar invalid");
    user.profile.bio = body.bio ?? user.profile.bio;
    user.profile.avatarUrl = body.avatarUrl ?? user.profile.avatarUrl;
    return ok(user.profile);
  }),
  http.get("http://localhost:3000/api/me/elo", ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    return ok({ elo: user.elo });
  }),
  http.get("http://localhost:3000/api/friends", ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const friends = db.friendsOf(user.username).map((name) => db.user(name)).filter(Boolean).map((u) => ({ id: u!.id, username: u!.username }));
    return ok({ friends, blocked: [] });
  }),
  http.post("http://localhost:3000/api/friends/requests", async ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const { receiverUsername } = (await request.json()) as Record<string, string>;
    if (!db.user(receiverUsername || "")) return fail(404, "NOT_FOUND", "receiverUsername not found.");
    const existing = db.requests.find((r) => r.requester === user.username && r.receiver === receiverUsername && r.status === "PENDING");
    if (existing) return fail(409, "CONFLICT", "friend request is already pending.");
    const requestId = id("fr");
    db.requests.push({ id: requestId, requester: user.username, receiver: receiverUsername, status: "PENDING" });
    return ok({ id: requestId, requesterId: user.id, receiverId: db.user(receiverUsername)!.id, status: "PENDING" });
  }),
  http.get("http://localhost:3000/api/friends/requests/pending", ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const pending = db.requests
      .filter((row) => row.receiver === user.username && row.status === "PENDING")
      .map((row) => ({
        id: row.id,
        requesterId: db.user(row.requester)!.id,
        receiverId: db.user(row.receiver)!.id,
        status: "PENDING" as const,
        requester: { id: db.user(row.requester)!.id, username: row.requester },
      }));
    return ok(pending);
  }),
  http.post("http://localhost:3000/api/friends/requests/:requestId/accept", ({ params, request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const req = db.requests.find((r) => r.id === params.requestId && r.receiver === user.username);
    if (!req) return fail(404, "NOT_FOUND", "friend request not found.");
    req.status = "ACCEPTED";
    return ok({ id: req.id, status: req.status });
  }),
  http.post("http://localhost:3000/api/friends/requests/:requestId/decline", ({ params, request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const req = db.requests.find((r) => r.id === params.requestId && r.receiver === user.username);
    if (!req) return fail(404, "NOT_FOUND", "friend request not found.");
    db.requests = db.requests.filter((row) => row.id !== req.id);
    return ok({ id: req.id, status: "DECLINED" });
  }),
  http.post("http://localhost:3000/api/blocks", async ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const { blockedUsername } = (await request.json()) as Record<string, string>;
    if (!db.user(blockedUsername || "")) return fail(404, "NOT_FOUND", "blockedUsername not found.");
    db.blocks.add(`${user.username}|${blockedUsername}`);
    return ok({ blockerId: user.id, blockedId: db.user(blockedUsername)!.id });
  }),
  http.delete("http://localhost:3000/api/blocks/:identifier", ({ request, params }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    db.blocks.delete(`${user.username}|${String(params.identifier)}`);
    return ok({ unblocked: true });
  }),
  http.get("http://localhost:3000/api/blocks", ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const rows = [...db.blocks].filter((key) => key.startsWith(`${user.username}|`)).map((key) => key.split("|")[1]).map((name) => db.user(name)).filter(Boolean).map((u) => ({ id: u!.id, username: u!.username }));
    return ok(rows);
  }),
  http.get("http://localhost:3000/api/chats/:username/messages", ({ request, params }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const target = String(params.username);
    const rows = db.messages.filter((m) => (m.sender === user.username && m.receiver === target) || (m.sender === target && m.receiver === user.username));
    return ok(rows.map((m) => ({ id: m.id, senderId: m.sender, receiverId: m.receiver, content: m.content, createdAt: m.createdAt })));
  }),
  http.post("http://localhost:3000/api/chats/:username/messages", async ({ request, params }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const target = String(params.username);
    if (db.isBlocked(user.username, target)) return fail(403, "FORBIDDEN", "messaging is blocked between these users.");
    const { content } = (await request.json()) as Record<string, string>;
    const row = { id: id("m"), sender: user.username, receiver: target, content, createdAt: new Date().toISOString() };
    db.messages.push(row);
    return ok({ id: row.id, senderId: row.sender, receiverId: row.receiver, content: row.content, createdAt: row.createdAt }, 201);
  }),
  http.post("http://localhost:3000/api/challenges", async ({ request }) => {
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "Missing bearer token.");
    const { receiverUsername } = (await request.json()) as Record<string, string>;
    if (db.isBlocked(user.username, receiverUsername)) return fail(403, "FORBIDDEN", "challenge is blocked between these users.");
    return ok({ id: id("c") }, 201);
  }),
  http.post("http://localhost:3000/api/queue/join", async ({ request }) => {
    const { username, mode } = (await request.json()) as { username: string; mode: "ranked" | "ffa" };
    const current = db.queue.get(username);
    if (current && current !== mode) return fail(409, "CONFLICT", "already queued in different mode");
    db.queue.set(username, mode);
    return ok({ mode, queued: true, position: 1 });
  }),
  http.post("http://localhost:3000/api/queue/leave", async ({ request }) => {
    const { username } = (await request.json()) as { username: string };
    db.queue.delete(username);
    return ok({ removed: true });
  }),
  http.get("http://localhost:3000/api/queue/state", ({ request }) => {
    const username = new URL(request.url).searchParams.get("username") || "";
    const mode = db.queue.get(username) ?? null;
    return ok({ mode, queued: Boolean(mode), position: mode ? 1 : undefined });
  }),
];
