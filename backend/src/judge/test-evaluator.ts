import { prepareTempDir, compileCode, runCode, cleanupTempDir } from "./sandbox-runner";
import type { EvaluationResult, TestCaseResult, Verdict } from "./types";

interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
}

interface DriverParts {
    header: string;
    footer: string;
}

interface EvaluateRequest {
    language: string;
    code: string;
    testCases: TestCase[];
    timeLimitMs: number;
    memoryLimitMb: number;
    // LeetCode-style driver parts (if present, wraps user code)
    drivers?: Record<string, DriverParts> | null;
}

/**
 * Assembles the final code to execute.
 * If drivers exist for this language, wraps user code with header/footer.
 * Otherwise, uses user code as-is (legacy stdin/stdout mode).
 */
function assembleCode(userCode: string, language: string, drivers?: Record<string, DriverParts> | null): string {
    if (!drivers) return userCode;

    const driver = drivers[language];
    if (!driver) return userCode;

    return driver.header + "\n" + userCode + "\n" + driver.footer;
}

/**
 * Compares outputs. Tries JSON-aware comparison first,
 * falls back to exact string match.
 */
function outputsMatch(actual: string, expected: string): boolean {
    const a = actual.trim();
    const e = expected.trim();

    // Exact string match
    if (a === e) return true;

    // Try JSON comparison (handles whitespace/formatting differences)
    try {
        const parsedA = JSON.parse(a);
        const parsedE = JSON.parse(e);
        return JSON.stringify(parsedA) === JSON.stringify(parsedE);
    } catch {
        return false;
    }
}

export async function evaluate(req: EvaluateRequest): Promise<EvaluationResult> {
    const finalCode = assembleCode(req.code, req.language, req.drivers);
    const tempDir = await prepareTempDir(req.language, finalCode);

    try {
        const compileResult = await compileCode(req.language, tempDir);

        if (!compileResult.success) {
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

            let verdict: Verdict;

            if (runResult.timedOut) {
                verdict = "TIME_LIMIT_EXCEEDED";
            } else if (runResult.exitCode === 137) {
                verdict = "MEMORY_LIMIT_EXCEEDED";
            } else if (runResult.exitCode !== 0) {
                verdict = "RUNTIME_ERROR";
            } else if (outputsMatch(runResult.stdout, tc.expectedOutput)) {
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
