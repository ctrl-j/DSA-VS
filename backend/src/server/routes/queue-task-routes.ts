import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import type { ConcurrentClientHandler } from "../../concurrent-client-handler";
import { getUserByUsername } from "../../database";
import type { GlobalMatchQueue } from "../../global-match-queue";
import { User } from "../../user";
import { getTrimmedString, readJsonBody, sendSuccess } from "../http-utils";
import { ApiException } from "../types";

export async function handleQueueTaskRoutes(
  req: IncomingMessage,
  url: URL,
  res: ServerResponse,
  deps: {
    globalMatchQueue: GlobalMatchQueue;
    concurrentClientHandler: ConcurrentClientHandler;
  }
): Promise<boolean> {
  const { globalMatchQueue, concurrentClientHandler } = deps;

  if (req.method === "POST" && url.pathname === "/api/queue/join") {
    const body = await readJsonBody(req);
    const rawMode = body.mode;
    const mode = rawMode === "ranked" || rawMode === "ffa" ? rawMode : null;
    if (!mode) {
      throw new ApiException(400, "VALIDATION_ERROR", "mode must be either 'ranked' or 'ffa'.");
    }

    const username = getTrimmedString(body.username);
    if (!username) {
      throw new ApiException(400, "VALIDATION_ERROR", "username is required.");
    }

    const userDb = await getUserByUsername(username);
    if (!userDb) {
      throw new ApiException(404, "NOT_FOUND", "user not found.");
    }

    const result = globalMatchQueue.join(
      new User({
        userId: userDb.id,
        username: userDb.username,
        elo: userDb.elo,
        authenticated: true,
      }),
      mode
    );

    sendSuccess(res, 200, result);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/queue/leave") {
    const body = await readJsonBody(req);
    const username = getTrimmedString(body.username);
    if (!username) {
      throw new ApiException(400, "VALIDATION_ERROR", "username is required.");
    }

    const user = await getUserByUsername(username);
    if (!user) {
      throw new ApiException(404, "NOT_FOUND", "user not found.");
    }

    const userId = user.id;
    sendSuccess(res, 200, globalMatchQueue.leave(userId));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/queue/state") {
    const username = getTrimmedString(url.searchParams.get("username"));
    if (!username) {
      throw new ApiException(400, "VALIDATION_ERROR", "username query param is required.");
    }

    const user = await getUserByUsername(username);
    if (!user) {
      throw new ApiException(404, "NOT_FOUND", "user not found.");
    }

    const userId = user.id;
    sendSuccess(res, 200, globalMatchQueue.getUserQueueState(userId));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/queue/snapshot") {
    sendSuccess(res, 200, globalMatchQueue.snapshot());
    return true;
  }

  if (
    req.method === "POST" &&
    (url.pathname === "/api/tasks/submit" || url.pathname === "/api/tasks/simulate")
  ) {
    const body = await readJsonBody(req);
    const rawDuration = Number(body.durationMs);
    const durationMs = Number.isFinite(rawDuration)
      ? Math.max(100, Math.min(rawDuration, 10_000))
      : 1000;

    const task = concurrentClientHandler.enqueueTask(durationMs);
    sendSuccess(res, 202, { taskId: task.id, status: task.status });
    return true;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/tasks/")) {
    const taskId = url.pathname.split("/").pop() || "";
    if (!taskId) {
      throw new ApiException(400, "VALIDATION_ERROR", "task id is required.");
    }

    const task = concurrentClientHandler.getTask(taskId);
    if (!task) {
      throw new ApiException(404, "NOT_FOUND", "task not found.");
    }

    sendSuccess(res, 200, task);
    return true;
  }

  return false;
}
