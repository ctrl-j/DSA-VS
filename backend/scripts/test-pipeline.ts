/**
 * End-to-end pipeline test.
 *
 * Tests the full path: WebSocket → BullMQ → Docker → results → WebSocket
 * for every seeded problem.
 *
 * Prerequisites:
 *   1. PostgreSQL + Redis running (docker compose up -d)
 *   2. Docker images built (docker build -t dsavs-runner-python ...)
 *   3. Database seeded (npm run seed)
 *   4. Backend server running (npm run dev)
 *
 * Usage:
 *   npx tsx scripts/test-pipeline.ts
 */

import WebSocket from "ws";

const BASE_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000/ws";

// ---------------------------------------------------------------------------
// Correct solutions for each seeded problem (Python)
// ---------------------------------------------------------------------------

const SOLUTIONS: Record<string, string> = {
  "Two Sum": `
a = int(input())
b = int(input())
print(a + b)
`.trim(),

  "Reverse String": `
print(input()[::-1])
`.trim(),

  "FizzBuzz": `
n = int(input())
for i in range(1, n + 1):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
`.trim(),

  "Palindrome Check": `
s = input().lower()
print("true" if s == s[::-1] else "false")
`.trim(),

  "Max of Array": `
n = int(input())
nums = list(map(int, input().split()))
print(max(nums))
`.trim(),

  "Count Vowels": `
s = input().lower()
print(sum(1 for c in s if c in "aeiou"))
`.trim(),

  "Fibonacci": `
n = int(input())
a, b = 0, 1
for _ in range(n):
    a, b = b, a + b
print(a)
`.trim(),

  "Sort Array": `
n = int(input())
nums = list(map(int, input().split()))
print(" ".join(map(str, sorted(nums))))
`.trim(),

  "Binary Search": `
first_line = input().split()
n, t = int(first_line[0]), int(first_line[1])
nums = list(map(int, input().split()))
lo, hi = 0, n - 1
result = -1
while lo <= hi:
    mid = (lo + hi) // 2
    if nums[mid] == t:
        result = mid
        break
    elif nums[mid] < t:
        lo = mid + 1
    else:
        hi = mid - 1
print(result)
`.trim(),

  "Valid Parentheses": `
s = input()
stack = []
pairs = {")": "(", "}": "{", "]": "["}
valid = True
for c in s:
    if c in "({[":
        stack.append(c)
    elif c in ")}]":
        if not stack or stack[-1] != pairs[c]:
            valid = False
            break
        stack.pop()
if stack:
    valid = False
print("true" if valid else "false")
`.trim(),
};

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function httpPost(path: string, body: object, token?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

// ---------------------------------------------------------------------------
// WebSocket helper — connects and provides send/receive
// ---------------------------------------------------------------------------

function connectWs(token: string): Promise<{
  ws: WebSocket;
  send: (event: string, payload: object) => void;
  waitFor: (event: string, filter?: (payload: any) => boolean, timeout?: number) => Promise<any>;
  close: () => void;
}> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    // Each waiter has an optional filter — messages that don't match stay in the queue
    type Waiter = { resolve: (payload: any) => void; filter?: (payload: any) => boolean };
    const pending = new Map<string, Waiter[]>();

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      const waiters = pending.get(msg.event);
      if (!waiters) return;

      // Find the first waiter whose filter matches (or has no filter)
      const idx = waiters.findIndex((w) => !w.filter || w.filter(msg.payload));
      if (idx !== -1) {
        const waiter = waiters.splice(idx, 1)[0];
        waiter.resolve(msg.payload);
      }
    });

    ws.on("open", () => {
      resolve({
        ws,
        send: (event, payload) => {
          ws.send(JSON.stringify({ event, payload }));
        },
        waitFor: (event, filter?: (payload: any) => boolean, timeout = 120_000) => {
          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              rej(new Error(`Timed out waiting for event: ${event}`));
            }, timeout);

            if (!pending.has(event)) {
              pending.set(event, []);
            }
            pending.get(event)!.push({
              resolve: (payload) => {
                clearTimeout(timer);
                res(payload);
              },
              filter,
            });
          });
        },
        close: () => ws.close(),
      });
    });

    ws.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Main test
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== DSA-VS End-to-End Pipeline Test ===\n");

  // --- Step 1: Register and login two test users ---
  console.log("1. Setting up test users...");

  const ts = String(Date.now()).slice(-6);
  const userA = { username: `trun_a_${ts}`, password: "testpass123!" };
  const userB = { username: `trun_b_${ts}`, password: "testpass123!" };

  await httpPost("/api/auth/register", userA);
  await httpPost("/api/auth/register", userB);

  const loginA = (await httpPost("/api/auth/login", userA)).data;
  const loginB = (await httpPost("/api/auth/login", userB)).data;

  console.log(`   User A: ${userA.username} (${loginA.user.id})`);
  console.log(`   User B: ${userB.username} (${loginB.user.id})\n`);

  // --- Step 2: Fetch all problems ---
  console.log("2. Fetching problems from database...");

  // Use a direct import to query problems — cleaner than adding an API endpoint
  const { prisma } = await import("../src/db/client");

  const problems = await prisma.problem.findMany({
    where: { isActive: true },
    include: { testCases: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`   Found ${problems.length} problems\n`);

  if (problems.length === 0) {
    console.error("   No problems found! Run 'npm run seed' first.");
    process.exit(1);
  }

  // --- Step 3: Create a match for each problem ---
  console.log("3. Creating matches...");

  const matches: { matchId: string; problemTitle: string; totalTests: number }[] = [];

  for (const problem of problems) {
    const match = await prisma.match.create({
      data: {
        mode: "RANKED",
        status: "ACTIVE",
        problemId: problem.id,
        startedAt: new Date(),
        participants: {
          create: [
            { userId: loginA.user.id, startElo: 1000 },
            { userId: loginB.user.id, startElo: 1000 },
          ],
        },
      },
    });

    matches.push({
      matchId: match.id,
      problemTitle: problem.title,
      totalTests: problem.testCases.length,
    });

    console.log(`   Match ${match.id.slice(0, 8)}... → ${problem.title} (${problem.testCases.length} tests)`);
  }
  console.log();

  // --- Step 4: Connect via WebSocket ---
  console.log("4. Connecting WebSocket...");
  const clientA = await connectWs(loginA.token);
  console.log("   Connected.\n");

  // --- Step 5: Submit solutions and verify results ---
  console.log("5. Submitting solutions...\n");

  let passed = 0;
  let failed = 0;

  for (const match of matches) {
    const solution = SOLUTIONS[match.problemTitle];
    if (!solution) {
      console.log(`   SKIP  ${match.problemTitle} — no solution defined`);
      failed++;
      continue;
    }

    process.stdout.write(`   ${match.problemTitle}... `);

    // Submit the code
    clientA.send("submission.create", {
      matchId: match.matchId,
      language: "python",
      code: solution,
    });

    // Wait for acceptance
    const accepted = await clientA.waitFor("submission.accepted");

    const submissionId = accepted.submissionId;

    // Wait for COMPLETED or FAILED — skip the intermediate RUNNING event
    const result = await clientA.waitFor(
      "submission.update",
      (p) => p.submissionId === submissionId && p.status !== "RUNNING",
    );

    if (result.status === "COMPLETED" && result.passedCount === match.totalTests) {
      console.log(`PASS (${result.passedCount}/${result.totalCount})`);
      passed++;
    } else if (result.status === "COMPLETED") {
      console.log(`FAIL (${result.passedCount}/${result.totalCount})`);
      // Show which test cases failed
      for (const tc of result.results ?? []) {
        if (tc.verdict !== "PASS") {
          console.log(`         ${tc.verdict}: got "${tc.stdout.trim()}" (test ${tc.testCaseId.slice(0, 8)}...)`);
        }
      }
      failed++;
    } else {
      console.log(`ERROR — status: ${result.status}, error: ${result.error ?? "unknown"}`);
      if (result.stderr) {
        console.log(`         stderr: ${result.stderr.slice(0, 200)}`);
      }
      failed++;
    }
  }

  // --- Step 6: Summary ---
  console.log("\n" + "=".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed, ${matches.length} total`);
  console.log("=".repeat(50));

  // --- Cleanup ---
  clientA.close();
  await prisma.$disconnect();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\nTest script crashed:", err);
  process.exit(1);
});
