const { randomUUID } = require("node:crypto");

class ConcurrentClientHandler {
  constructor(maxConcurrentWorkers) {
    this.maxConcurrentWorkers = maxConcurrentWorkers;

    // TODO: in memory for now, will have to make it so it interfaces with database
    this.pending = [];  // FIFO queue of tasks
    this.tasks = new Map(); // task lookup by id
    this.running = 0; // count of currently executing tasks
  }

  // public API used by the HTTP server
  // enqueue work, inspect one task, inspect current queue health
  enqueueTask(durationMs) {
    const task = {
      id: randomUUID(),
      status: "queued",
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
    };
    
    // populate task map with set task
    this.tasks.set(task.id, task);
    this.pending.push({ task, durationMs });
    this.drainQueue();
    return task;
  }

  // finds task mapped to taskId, returns null if none
  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  // quick testing function
  getHealthSnapshot() {
    return {
      runningTasks: this.running,
      queuedTasks: this.pending.length,
      taskConcurrency: this.maxConcurrentWorkers,
    };
  }

  // runs queued tasks while capacity exists
  drainQueue() {
    // loops while ClientHandler has any tasks and remaining tasks
    while (this.running < this.maxConcurrentWorkers && this.pending.length > 0) {
      const next = this.pending.shift();
      // intentionally not awaited so tasks can run concurrently
      this.runTask(next.task, next.durationMs);
    }
  }

  // runs one task through its lifecycle.
  async runTask(task, durationMs) {
    // Claim one worker slot before starting async work.
    this.running += 1;
    task.status = "running";
    task.startedAt = new Date().toISOString();

    // TODO: actually run the task
    await new Promise((resolve) => setTimeout(resolve, durationMs));

    // TODO: add branches to logic for if err during running task
    
    // Persist completion metadata for status polling clients.
    task.status = "completed";
    task.completedAt = new Date().toISOString();
    task.result = { durationMs };

    // Release worker slot, then try to start the next queued task.
    this.running -= 1;
    this.drainQueue();
  }
}

module.exports = { ConcurrentClientHandler };
