import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock sandbox-runner before importing evaluate
jest.mock("../judge/sandbox-runner", () => ({
  prepareTempDir: jest.fn<() => Promise<string>>().mockResolvedValue("/tmp/fake"),
  compileCode: jest.fn<() => Promise<{ success: boolean; stderr: string }>>().mockResolvedValue({ success: true, stderr: "" }),
  runCode: jest.fn<() => Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }>>(),
  cleanupTempDir: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

import { evaluate } from "../judge/test-evaluator";
import { runCode } from "../judge/sandbox-runner";

const mockedRunCode = runCode as jest.MockedFunction<typeof runCode>;

describe("Story 2 - Code Execution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set defaults after clearAllMocks
    const sandbox = require("../judge/sandbox-runner");
    sandbox.prepareTempDir.mockResolvedValue("/tmp/fake");
    sandbox.compileCode.mockResolvedValue({ success: true, stderr: "" });
    sandbox.cleanupTempDir.mockResolvedValue(undefined);
  });

  it("returns PASS when output matches exactly", async () => {
    mockedRunCode.mockResolvedValue({
      stdout: "42\n",
      stderr: "",
      exitCode: 0,
      timedOut: false,
    });

    const result = await evaluate({
      language: "python",
      code: "print(42)",
      testCases: [{ id: "tc1", input: "", expectedOutput: "42" }],
      timeLimitMs: 5000,
      memoryLimitMb: 256,
    });

    expect(result.passedCount).toBe(1);
    expect(result.results[0].verdict).toBe("PASS");
  });

  it("returns PASS for JSON-equivalent outputs", async () => {
    mockedRunCode.mockResolvedValue({
      stdout: '[1,  2, 3]\n',
      stderr: "",
      exitCode: 0,
      timedOut: false,
    });

    const result = await evaluate({
      language: "python",
      code: "print([1,2,3])",
      testCases: [{ id: "tc1", input: "", expectedOutput: "[1,2,3]" }],
      timeLimitMs: 5000,
      memoryLimitMb: 256,
    });

    expect(result.passedCount).toBe(1);
    expect(result.results[0].verdict).toBe("PASS");
  });

  it("returns WRONG_ANSWER when output does not match", async () => {
    mockedRunCode.mockResolvedValue({
      stdout: "99\n",
      stderr: "",
      exitCode: 0,
      timedOut: false,
    });

    const result = await evaluate({
      language: "python",
      code: "print(99)",
      testCases: [{ id: "tc1", input: "", expectedOutput: "42" }],
      timeLimitMs: 5000,
      memoryLimitMb: 256,
    });

    expect(result.passedCount).toBe(0);
    expect(result.results[0].verdict).toBe("WRONG_ANSWER");
  });

  it("returns TIME_LIMIT_EXCEEDED when timed out", async () => {
    mockedRunCode.mockResolvedValue({
      stdout: "",
      stderr: "",
      exitCode: 0,
      timedOut: true,
    });

    const result = await evaluate({
      language: "python",
      code: "while True: pass",
      testCases: [{ id: "tc1", input: "", expectedOutput: "42" }],
      timeLimitMs: 5000,
      memoryLimitMb: 256,
    });

    expect(result.results[0].verdict).toBe("TIME_LIMIT_EXCEEDED");
  });
});
