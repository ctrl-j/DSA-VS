import { prepareTempDir, compileCode, runCode, cleanupTempDir } from "./sandbox-runner";
import type { EvaluationResult, TestCaseResult, Verdict } from "./types";

// A test case as it comes from Prisma. We only need these fields.
interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
}

// What the BullMQ worker passes in
interface EvaluateRequest {
    language: string;
    code: string;
    testCases: TestCase[];
    timeLimitMs: number;      // from Problem.timeLimitMs
    memoryLimitMb: number;    // from Problem.memoryLimitMb
}

/**
 * Runs user code against all test cases for a problem.
 *
 * Flow:
 *   1. Write code to temp dir
 *   2. Compile once (if needed)
 *   3. Run against each test case
 *   4. Collect verdicts and count passes
 *   5. Clean up
 */
export async function evaluate(req: EvaluateRequest): Promise<EvaluationResult> {
    const tempDir = await prepareTempDir(req.language, req.code);

    try {
        // --- Compile once (no-op for Python) ---
        const compileResult = await compileCode(req.language, tempDir);

        if (!compileResult.success) {
            // Every test case gets COMPILATION_ERROR — code didn't compile
            const results: TestCaseResult[] = req.testCases.map((tc) => ({
                testCaseId: tc.id,
                verdict: "COMPILATION_ERROR" as Verdict,
                stdout: "",
                stderr: compileResult.stderr,
            }));

            return {
                passedCount: 0,
                totalCount: req.testCases.length,
                results,
            };
        }

        // --- Run each test case ---
        const results: TestCaseResult[] = [];
        let passedCount = 0;

        for (const tc of req.testCases) {
            const runResult = await runCode(
                req.language,
                tempDir,
                tc.input,
                req.timeLimitMs,
                req.memoryLimitMb,
            );

            // Determine the verdict for this test case
            let verdict: Verdict;

            if (runResult.timedOut) {
                verdict = "TIME_LIMIT_EXCEEDED";
            } else if (runResult.exitCode === 137) {
                verdict = "MEMORY_LIMIT_EXCEEDED";
            } else if (runResult.exitCode !== 0) {
                verdict = "RUNTIME_ERROR";
            } else if (runResult.stdout.trim() === tc.expectedOutput.trim()) {
                verdict = "PASS";
                passedCount++;
            } else {
                verdict = "WRONG_ANSWER";
            }

            results.push({
                testCaseId: tc.id,
                verdict,
                stdout: runResult.stdout,
                stderr: runResult.stderr,
            });
        }

        return { passedCount, totalCount: req.testCases.length, results };
    } finally {
        await cleanupTempDir(tempDir);
    }
}
