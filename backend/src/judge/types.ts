// Shared types for the judge system.
// Used by sandbox-runner, test-evaluator, and execution-queue.

// Union type — can only be one of these exact strings
export type Verdict =
  | "PASS"
  | "WRONG_ANSWER"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "COMPILATION_ERROR";

// What sandbox-runner returns after executing a test case
export interface SandboxResult {
  verdict: Verdict;
  stdout: string;
  stderr: string;
  exitCode: number;
}

// What sandbox-runner expects as input
export interface ExecutionRequest {
  language: string;
  code: string;
  input: string;
  expectedOutput: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}
