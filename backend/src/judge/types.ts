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

// What compileCode returns
export interface CompileResult {
  success: boolean;
  stderr: string;       // compiler error message if failed
}

// What runCode returns for a single test case execution
export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

// One test case's verdict, returned by test-evaluator
export interface TestCaseResult {
  testCaseId: string;
  verdict: Verdict;
  stdout: string;
  stderr: string;
}

// The full evaluation result for a submission
export interface EvaluationResult {
  passedCount: number;
  totalCount: number;
  results: TestCaseResult[];
}
