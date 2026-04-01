import { Queue, Worker } from "bullmq";
import { SubmissionStatus } from "@prisma/client";
import { prisma } from "../db/client";
import { updateSubmission, updateMatchParticipantProgress, getMatchById } from "../database";
import { evaluate } from "./test-evaluator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// The data that gets stored in each Redis job
interface ExecutionJobData {
    submissionId: string;
    matchId: string;
    userId: string;
    problemId: string;
    language: string;
    code: string;
}

// The sendToUser function from WsRuntime — passed in during setup
// so the worker can push results back to clients via WebSocket
type SendToUser = (userId: string, event: string, payload: unknown) => void;

// ---------------------------------------------------------------------------
// Redis connection config — reused by both Queue and Worker
// ---------------------------------------------------------------------------

const redisConnection = {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
};

// ---------------------------------------------------------------------------
// Queue — the producer side.
// ws-runtime.ts calls enqueueSubmission() to add jobs.
// ---------------------------------------------------------------------------

const executionQueue = new Queue<ExecutionJobData>("code-execution", {
    connection: redisConnection,
});

/**
 * Add a submission to the execution queue.
 * Called from ws-runtime.ts when a user submits code.
 */
export async function enqueueSubmission(data: ExecutionJobData): Promise<void> {
    await executionQueue.add("execute", data);
}

// ---------------------------------------------------------------------------
// Worker — the consumer side.
// Pulls jobs from Redis and runs them through the judge pipeline.
//
// We export a setup function (not auto-start) because the worker needs
// access to sendToUser from WsRuntime, which isn't available at import time.
// ---------------------------------------------------------------------------

export function startExecutionWorker(sendToUser: SendToUser): Worker {
    const worker = new Worker<ExecutionJobData>(
        "code-execution",
        async (job) => {
            const { submissionId, matchId, userId, problemId, language, code } = job.data;

            // 1. Mark submission as RUNNING
            await updateSubmission(submissionId, { status: SubmissionStatus.RUNNING });
            sendToUser(userId, "submission.update", {
                submissionId,
                status: "RUNNING",
            });

            // 2. Fetch the problem's test cases and limits from DB
            const problem = await prisma.problem.findUnique({
                where: { id: problemId },
                include: { testCases: true },
            });

            if (!problem) {
                await updateSubmission(submissionId, { status: SubmissionStatus.FAILED });
                sendToUser(userId, "submission.update", {
                    submissionId,
                    status: "FAILED",
                    error: "Problem not found",
                });
                return;
            }

            // 3. Run the code against all test cases
            const result = await evaluate({
                language,
                code,
                testCases: problem.testCases,
                timeLimitMs: problem.timeLimitMs,
                memoryLimitMb: problem.memoryLimitMb,
            });

            // 4. Update submission in DB
            await updateSubmission(submissionId, {
                status: SubmissionStatus.COMPLETED,
                passedCount: result.passedCount,
            });

            // 5. Update the participant's best score in the match
            await updateMatchParticipantProgress(matchId, userId, result.passedCount);

            // 6. Send results to both players via WebSocket
            const match = await getMatchById(matchId);
            if (!match) return;

            const me = match.participants.find((p) => p.userId === userId);
            const opponent = match.participants.find((p) => p.userId !== userId);
            if (!me || !opponent) return;

            // Send detailed results to the submitter
            sendToUser(userId, "submission.update", {
                submissionId,
                status: "COMPLETED",
                passedCount: result.passedCount,
                totalCount: result.totalCount,
                results: result.results,
            });

            // Send progress update to both players
            sendToUser(userId, "match.progress", {
                matchId,
                mePassed: me.passedCount,
                opponentPassed: opponent.passedCount,
            });
            sendToUser(opponent.userId, "match.progress", {
                matchId,
                mePassed: opponent.passedCount,
                opponentPassed: me.passedCount,
            });
        },
        {
            connection: redisConnection,
            concurrency: 2,  // process 2 submissions at a time
        },
    );

    // Log errors so they don't silently disappear
    worker.on("failed", (job, err) => {
        console.error(`Execution job ${job?.id} failed:`, err);
    });

    return worker;
}
