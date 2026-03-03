import { randomUUID } from "node:crypto";

export interface TaskResult {
  durationMs: number;
}

export interface Task {
  id: string;
  status: "queued" | "running" | "completed";
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  result: TaskResult | null;
}

interface PendingTask {
  task: Task;
  durationMs: number;
}

export interface HealthSnapshot {
  runningTasks: number;
  queuedTasks: number;
  taskConcurrency: number;
}

export class ConcurrentClientHandler {
  private maxConcurrentWorkers: number;
  private pending: PendingTask[];
  private tasks: Map<string, Task>;
  private running: number;

  constructor(maxConcurrentWorkers: number) {
    this.maxConcurrentWorkers = maxConcurrentWorkers;

    // TODO: in memory for now, will have to make it so it interfaces with database
    this.pending = []; // FIFO queue of tasks
    this.tasks = new Map(); // task lookup by id
    this.running = 0; // count of currently executing tasks
  }

  // public API used by the HTTP server
  // enqueue work, inspect one task, inspect current queue health
  enqueueTask(durationMs: number): Task {
    const task: Task = {
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
  getTask(taskId: string): Task | null {
    const task = this.tasks.get(taskId);
    if (task) {
      return task;
    }
    return null;
  }

  // quick testing function
  getHealthSnapshot(): HealthSnapshot {
    return {
      runningTasks: this.running,
      queuedTasks: this.pending.length,
      taskConcurrency: this.maxConcurrentWorkers,
    };
  }

  // runs queued tasks while capacity exists
  private drainQueue(): void {
    // loops while ClientHandler has any tasks and remaining tasks
    while (this.running < this.maxConcurrentWorkers && this.pending.length > 0) {
      const next = this.pending.shift();
      if (!next) {
        return;
      }
      // intentionally not awaited so tasks can run concurrently
      void this.runTask(next.task, next.durationMs);
    }
  }

  // runs one task through its lifecycle.
  private async runTask(task: Task, durationMs: number): Promise<void> {
    // Claim one worker slot before starting async work.
    this.running += 1;
    task.status = "running";
    task.startedAt = new Date().toISOString();

    // Simulated async work for Sprint 1.
    await new Promise<void>((resolve) => setTimeout(resolve, durationMs));

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
