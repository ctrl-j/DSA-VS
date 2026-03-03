import * as http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { ConcurrentClientHandler } from "./concurrent-client-handler";
import { GlobalMatchQueue } from "./global-match-queue";
import { User, UserPayload } from "./user";

interface JsonObject {
  [key: string]: unknown;
}

// resolve server port from process.env or default to 3000
let portValue: number;
if (process.env.PORT) {
  portValue = Number(process.env.PORT);
} else {
  portValue = 3000;
}
const PORT = portValue;

// set max concurrent tasks from process.env env or default to 1
let taskConcurrencyValue: number;
const parsed = Number(process.env.TASK_CONCURRENCY);
if (Number.isFinite(parsed)) {
  taskConcurrencyValue = Math.max(1, Math.floor(parsed));
} else {
  taskConcurrencyValue = 1;
}
const TASK_CONCURRENCY = taskConcurrencyValue;

// delegate concurrent task scheduling to client handler class
const concurrentClientHandler = new ConcurrentClientHandler(TASK_CONCURRENCY);
const globalMatchQueue = new GlobalMatchQueue();

async function readJsonBody(req: IncomingMessage): Promise<JsonObject> {
  // collect request chunks and parse JSON once the stream ends
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else {
      chunks.push(Buffer.from(chunk));
    }
  }
  // For empty body, return an empty object to keep route handlers simple.
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as JsonObject;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  // shared response helper for consistent JSON replies.
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    // Parse incoming URL path so we can route by method + pathname.
    const url = new URL(req.url ?? "/", "http://localhost");

    // Health check: reports server status and queue depth.
    if (req.method === "GET" && url.pathname === "/health") {
      const queueHealth = concurrentClientHandler.getHealthSnapshot();
      sendJson(res, 200, {
        status: "ok",
        runningTasks: queueHealth.runningTasks,
        queuedTasks: queueHealth.queuedTasks,
        taskConcurrency: queueHealth.taskConcurrency,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/queue/join") {
      const body = await readJsonBody(req);
      handleJoinQueue(body, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/queue/leave") {
      const body = await readJsonBody(req);
      const rawUserId = body.userId;
      let userId: string;
      if (typeof rawUserId === "string") {
        userId = rawUserId.trim();
      } else {
        userId = "";
      }

      if (!userId) {
        sendJson(res, 400, { error: "userId is required." });
        return;
      }
      sendJson(res, 200, globalMatchQueue.leave(userId));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/queue/state") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        sendJson(res, 400, { error: "userId query param is required." });
        return;
      }
      sendJson(res, 200, globalMatchQueue.getUserQueueState(userId));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/queue/snapshot") {
      sendJson(res, 200, globalMatchQueue.snapshot());
      return;
    }

    // 1) parse JSON body
    // 2) read durationMs
    // 3) sanitize duration input
    // 4) enqueue task
    // 5) return task id for polling
    if (
      req.method === "POST" &&
      (url.pathname === "/api/tasks/submit" || url.pathname === "/api/tasks/simulate")
    ) {
      const body = await readJsonBody(req);
      const rawDuration = Number(body.durationMs);
      const durationMs = Number.isFinite(rawDuration)
        ? Math.max(100, Math.min(rawDuration, 10000))
        : 1000;

      const task = concurrentClientHandler.enqueueTask(durationMs);
      sendJson(res, 202, { taskId: task.id, status: task.status });
      return;
    }

    // Task status fetch by id.
    if (req.method === "GET" && url.pathname.startsWith("/api/tasks/")) {
      const taskId = url.pathname.split("/").pop();
      if (!taskId) {
        sendJson(res, 400, { error: "Task id is required." });
        return;
      }

      const task = concurrentClientHandler.getTask(taskId);
      if (!task) {
        sendJson(res, 404, { error: "Task not found" });
        return;
      }
      sendJson(res, 200, task);
      return;
    }

    // No matching route.
    sendJson(res, 404, { error: "Not Found" });
  } catch (error: unknown) {
    // Handles malformed JSON and other request-level errors.
    let details = "Unknown error";
    if (error instanceof Error) {
      details = error.message;
    }
    sendJson(res, 400, { error: "Invalid request", details });
  }
});

function handleJoinQueue(body: JsonObject, res: ServerResponse): void {
  try {
    const rawMode = body.mode;
    let mode: "ranked" | "ffa";
    if (rawMode === "ranked" || rawMode === "ffa") {
      mode = rawMode;
    } else {
      throw new Error("mode must be either 'ranked' or 'ffa'.");
    }

    const rawUser = body.user as UserPayload | null | undefined;
    const user = User.fromPayload(rawUser);
    const result = globalMatchQueue.join(user, mode);
    sendJson(res, 200, result);
  } catch (error: unknown) {
    let message = "Invalid request";
    if (error instanceof Error) {
      message = error.message;
    }
    sendJson(res, 400, { error: message });
  }
}

// starts listening HTTPS request
server.listen(PORT, () => {
  console.log(
    `Concurrent server running on port ${PORT} (task concurrency=${TASK_CONCURRENCY})`
  );
});
