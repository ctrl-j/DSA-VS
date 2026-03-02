const http = require("node:http");
const { URL } = require("node:url");
const { ConcurrentClientHandler } = require("./concurrent-client-handler");

// resolve server port from process.env or default to 3000
let portValue;
if (process.env.PORT) {
  portValue = Number(process.env.PORT);
} else {
  portValue = 3000;
}
const PORT = portValue;

// set max concurrent tasks from process.env env or default to 1
let taskConcurrencyValue;
const parsed = Number(process.env.TASK_CONCURRENCY);
if (Number.isFinite(parsed)) {
  taskConcurrencyValue = Math.max(1, Math.floor(parsed));
} else {
  taskConcurrencyValue = 1;
}
const TASK_CONCURRENCY = taskConcurrencyValue;

// delegate concurrent task scheduling to client handler class
const concurrentClientHandler = new ConcurrentClientHandler(TASK_CONCURRENCY);

async function readJsonBody(req) {
  // collect request chunks and parse JSON once the stream ends
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  // For empty body, return an empty object to keep route handlers simple.
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, statusCode, payload) {
  // shared response helper for consistent JSON replies.
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  try {
    // Parse incoming URL path so we can route by method + pathname.
    const url = new URL(req.url, "http://localhost");

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
  } catch (error) {
    // Handles malformed JSON and other request-level errors.
    sendJson(res, 400, { error: "Invalid request", details: error.message });
  }
});

// starts listening HTTPS request
server.listen(PORT, () => {
  console.log(
    `Concurrent server running on port ${PORT} (task concurrency=${TASK_CONCURRENCY})`
  );
});
