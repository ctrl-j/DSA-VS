import * as http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { URL } from "node:url";
import { ConcurrentClientHandler } from "./concurrent-client-handler";
import { mapKnownError, requireAuth, sendError, sendSuccess } from "./server/http-utils";
import { handleAuthRoutes } from "./server/routes/auth-routes";
import { handleChatChallengeRoutes } from "./server/routes/chat-challenge-routes";
import { handleFriendsBlocksRoutes } from "./server/routes/friends-blocks-routes";
import { handleMatchesRoutes } from "./server/routes/matches-routes";
import { handleMeRoutes } from "./server/routes/me-routes";
import { handleProblemRoutes } from "./server/routes/problem-routes";
import { handleQueueTaskRoutes } from "./server/routes/queue-task-routes";
import { handleReportsAdminRoutes } from "./server/routes/reports-admin-routes";
import { handleTestClientRoute } from "./server/routes/test-client-route";
import { ApiException } from "./server/types";
import { createWsRuntime } from "./server/ws-runtime";
import { GlobalMatchQueue } from "./global-match-queue";

let portValue = Number(process.env.PORT);
if (!Number.isFinite(portValue) || portValue <= 0) {
  portValue = 3000;
}
const PORT = Math.floor(portValue);

let taskConcurrencyValue = Number(process.env.TASK_CONCURRENCY);
if (!Number.isFinite(taskConcurrencyValue) || taskConcurrencyValue <= 0) {
  taskConcurrencyValue = 1;
}
const TASK_CONCURRENCY = Math.floor(taskConcurrencyValue);

const concurrentClientHandler = new ConcurrentClientHandler(TASK_CONCURRENCY);
const globalMatchQueue = new GlobalMatchQueue();
const wsRuntime = createWsRuntime(globalMatchQueue);

async function handleHttpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    });
    res.end();
    return;
  }

  if (await handleTestClientRoute(req, url, res)) {
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    const queueHealth = concurrentClientHandler.getHealthSnapshot();

    sendSuccess(res, 200, {
      status: "ok",
      runningTasks: queueHealth.runningTasks,
      queuedTasks: queueHealth.queuedTasks,
      taskConcurrency: queueHealth.taskConcurrency,
      wsClients: wsRuntime.getClientCount(),
    });
    return;
  }

  if (await handleAuthRoutes(req, url, res)) {
    return;
  }

  if (await handleQueueTaskRoutes(req, url, res, { globalMatchQueue, concurrentClientHandler })) {
    return;
  }

  const auth = await requireAuth(req);
  const currentUser = auth.session.user;

  if (await handleMeRoutes(req.method, url, res, currentUser, req)) {
    return;
  }

  if (await handleFriendsBlocksRoutes(req.method, url, res, currentUser, req)) {
    return;
  }

  if (await handleChatChallengeRoutes(req.method, url, res, currentUser, req, wsRuntime.sendToUser)) {
    return;
  }

  if (await handleReportsAdminRoutes(req.method, url, res, currentUser, req)) {
    return;
  }

  if (await handleProblemRoutes(req.method, url, res, currentUser, req)) {
    return;
  }

  if (await handleMatchesRoutes(req.method, url, res, currentUser)) {
    return;
  }

  throw new ApiException(404, "NOT_FOUND", "Route not found.");
}

const server = http.createServer(async (req, res) => {
  try {
    await handleHttpRequest(req, res);
  } catch (error: unknown) {
    const mapped = mapKnownError(error);
    sendError(res, mapped.statusCode, mapped.code, mapped.message, mapped.details);
  }
});

server.on("upgrade", wsRuntime.handleUpgrade);

server.listen(PORT, () => {
  const address = server.address() as AddressInfo | null;
  const resolvedPort = address ? address.port : PORT;
  console.log(
    `DSA VS server listening on port ${resolvedPort} (task concurrency=${TASK_CONCURRENCY})`
  );
});

export { server };
