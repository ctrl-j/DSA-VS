import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { LANGUAGES } from "./language-config";
import type { SandboxResult, ExecutionRequest } from "./types";

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

// main function
export async function executeTestCase(req: ExecutionRequest): Promise<SandboxResult> {
    const lang = LANGUAGES[req.language];
    if (!lang) {
        throw new Error(`Unsupported language: ${req.language}`);
    }

    //create unique temp directory to hold the user's code
    const execId = randomUUID();
    const tempDir = join("/tmp", "dsavs-submissions", execId);
    await mkdir(tempDir, { recursive: true});

    try {
        // writes user code to file on host
        const hostCodePath = join(tempDir, lang.fileName);
        await writeFile(hostCodePath, req.code);

        // same file appears inside container
        const containerCodePath = join("/code", lang.fileName);

        // compiler step
        if (lang.compiled && lang.compileCmd) {
            const compileResult = await runContainer({
                image: lang.image,
                command: lang.compileCmd(containerCodePath),
                mountDir: tempDir,
                readOnly: false,
                input: "",
                timeLimitMs: 30_000,
                memoryLimitMb: 512,
            });
            if (compileResult.exitCode !== 0) {
                return {
                    verdict: "COMPILATION_ERROR",
                    stdout: compileResult.stdout,
                    stderr: compileResult.stderr,
                    exitCode: compileResult.exitCode,
                };
            }
        }
        // run step
        const runResult = await runContainer({
            image: lang.image,
            command: lang.runCmd(containerCodePath),
            mountDir: tempDir,
            readOnly: true,
            input: req.input,
            timeLimitMs: req.timeLimitMs,
            memoryLimitMb: req.memoryLimitMb,
        });

        // interpret what happened
        if (runResult.timedOut) {
            return { verdict: "TIME_LIMIT_EXCEEDED", stdout: runResult.stdout, stderr: runResult.stderr, exitCode: runResult.exitCode };
        }
        // 137 = 128 + 9 (SIGKILL). Docker sends SIGKILL when memory limit is hit.
        if (runResult.exitCode === 137) {
            return { verdict: "MEMORY_LIMIT_EXCEEDED", stdout: runResult.stdout, stderr: runResult.stderr, exitCode: runResult.exitCode };
        }
        // any other non-zero exit = the code crashed
        if (runResult.exitCode !== 0) {
            return { verdict: "RUNTIME_ERROR", stdout: runResult.stdout, stderr: runResult.stderr, exitCode: runResult.exitCode };
        }

        // code ran cleanly — compare output to expected
        const passed = runResult.stdout.trim() === req.expectedOutput.trim();
        return {
            verdict: passed ? "PASS" : "WRONG_ANSWER",
            stdout: runResult.stdout,
            stderr: runResult.stderr,
            exitCode: 0,
        };
    } finally {
        // always clean up temp directory, even if something threw
        await rm(tempDir, { recursive: true, force: true });
    }
}

function runContainer(opts: ContainerOptions): Promise<ContainerResult> {
    // ":ro" = read-only, container can't modify the mounted files
    const mountFlag = opts.readOnly
        ? `${opts.mountDir}:/code:ro`
        : `${opts.mountDir}:/code`;

    const args = [
        "run", "--rm", "-i",                        // --rm: delete container after exit, -i: allow stdin
        "--network", "none",                         // no internet access
        "--memory", `${opts.memoryLimitMb}m`,        // memory cap
        "--cpus", "1",                               // 1 CPU core max
        "--pids-limit", "64",                        // prevents fork bombs
        "-v", mountFlag,                             // mount code directory into container
        opts.image,                                  // e.g. "dsavs-runner-python"
        ...opts.command,                             // e.g. ["python", "/code/solution.py"]
    ];

    // We return a new Promise and resolve/reject it manually.
    // spawn() gives us a child process with stdin/stdout/stderr streams
    // that we can read from and write to.
    return new Promise((resolve) => {
        const child = spawn("docker", args);

        // Collect stdout and stderr into strings as data arrives in chunks
        let stdout = "";
        let stderr = "";
        let timedOut = false;

        // "on('data', ...)" means "call this function each time new output arrives"
        child.stdout.on("data", (chunk: Buffer) => {
            stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString();
        });

        // Write test input to the container's stdin, then close it.
        // "end()" means "I'm done writing, close the stream."
        // This is like typing input and pressing Ctrl+D in a terminal.
        if (opts.input) {
            child.stdin.write(opts.input);
        }
        child.stdin.end();

        // Kill the process if it runs too long
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");       // forcefully terminate
        }, opts.timeLimitMs);

        // "close" fires when the process exits and all streams are done
        child.on("close", (exitCode: number | null) => {
            clearTimeout(timer);         // cancel the timeout since process finished
            resolve({
                stdout,
                stderr,
                exitCode: exitCode ?? 1, // null means killed by signal, default to 1
                timedOut,
            });
        });
    });
}