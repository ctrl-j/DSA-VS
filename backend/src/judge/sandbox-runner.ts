import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { LANGUAGES } from "./language-config";
import type { CompileResult, RunResult } from "./types";

// ---------------------------------------------------------------------------
// Private types — only used within this file
// ---------------------------------------------------------------------------

interface ContainerOptions {
    image: string;
    command: string[];
    mountDir: string;
    readOnly: boolean;
    input: string;
    timeLimitMs: number;
    memoryLimitMb: number;
}

interface ContainerResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
}

// ---------------------------------------------------------------------------
// Public: create a temp directory and write user code to it.
// Returns the temp dir path — caller is responsible for cleanup.
// ---------------------------------------------------------------------------

export async function prepareTempDir(language: string, code: string): Promise<string> {
    const lang = LANGUAGES[language];
    if (!lang) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const execId = randomUUID();
    const tempDir = join("/tmp", "dsavs-submissions", execId);
    await mkdir(tempDir, { recursive: true });

    const hostCodePath = join(tempDir, lang.fileName);
    await writeFile(hostCodePath, code);

    return tempDir;
}

// ---------------------------------------------------------------------------
// Public: clean up a temp directory when done with all test cases.
// ---------------------------------------------------------------------------

export async function cleanupTempDir(tempDir: string): Promise<void> {
    await rm(tempDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Public: compile code (C++, Java). No-op for interpreted languages.
// Called ONCE before running test cases.
// ---------------------------------------------------------------------------

export async function compileCode(language: string, tempDir: string): Promise<CompileResult> {
    const lang = LANGUAGES[language];
    if (!lang) {
        throw new Error(`Unsupported language: ${language}`);
    }

    // Interpreted languages (Python) don't need compilation
    if (!lang.compiled || !lang.compileCmd) {
        return { success: true, stderr: "" };
    }

    const containerCodePath = join("/code", lang.fileName);

    const result = await runContainer({
        image: lang.image,
        command: lang.compileCmd(containerCodePath),
        mountDir: tempDir,
        readOnly: false,       // compiler writes output files
        input: "",
        timeLimitMs: 30_000,
        memoryLimitMb: 512,
    });

    return {
        success: result.exitCode === 0,
        stderr: result.stderr,
    };
}

// ---------------------------------------------------------------------------
// Public: run code against a single test case input.
// Called ONCE PER TEST CASE. Reuses the compiled binary from compileCode.
// ---------------------------------------------------------------------------

export async function runCode(
    language: string,
    tempDir: string,
    input: string,
    timeLimitMs: number,
    memoryLimitMb: number,
): Promise<RunResult> {
    const lang = LANGUAGES[language];
    if (!lang) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const containerCodePath = join("/code", lang.fileName);

    return await runContainer({
        image: lang.image,
        command: lang.runCmd(containerCodePath),
        mountDir: tempDir,
        readOnly: true,
        input,
        timeLimitMs,
        memoryLimitMb,
    });
}

// ---------------------------------------------------------------------------
// Private: spawns a Docker container and returns its output
// ---------------------------------------------------------------------------

function runContainer(opts: ContainerOptions): Promise<ContainerResult> {
    const mountFlag = opts.readOnly
        ? `${opts.mountDir}:/code:ro`
        : `${opts.mountDir}:/code`;

    const args = [
        "run", "--rm", "-i",
        "--network", "none",
        "--memory", `${opts.memoryLimitMb}m`,
        "--cpus", "1",
        "--pids-limit", "64",
        "-v", mountFlag,
        opts.image,
        ...opts.command,
    ];

    return new Promise((resolve) => {
        const child = spawn("docker", args);

        let stdout = "";
        let stderr = "";
        let timedOut = false;

        child.stdout.on("data", (chunk: Buffer) => {
            stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString();
        });

        if (opts.input) {
            child.stdin.write(opts.input);
        }
        child.stdin.end();

        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, opts.timeLimitMs);

        child.on("close", (exitCode: number | null) => {
            clearTimeout(timer);
            resolve({
                stdout,
                stderr,
                exitCode: exitCode ?? 1,
                timedOut,
            });
        });
    });
}
