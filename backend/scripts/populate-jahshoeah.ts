import { MatchMode, MatchStatus } from "@prisma/client";
import { prisma } from "../src/db/client";

const JAHSHOEAH_USERNAME = "JahShoeAh";

type FocusPlanEntry = {
  category: string;
  durationMin: number;
  daysAgo: number;
  hourOfDay: number;
};

type MatchPlanEntry = {
  language: "python" | "cpp" | "java";
  problemTitle: string;
  myPassed: number;
  oppPassed: number;
  totalTests: number;
  daysAgo: number;
  outcome: "win" | "loss" | "tie";
};

// Focus sessions spread across categories, days of week, and last ~5 weeks.
// Distribution is intentionally uneven so the dashboard shows interesting
// "strengths" (arrays) and heavier practice on weekends/Wednesdays.
const FOCUS_PLAN: FocusPlanEntry[] = [
  // arrays — strongest (~13 hours)
  { category: "arrays", durationMin: 55, daysAgo: 1, hourOfDay: 14 },
  { category: "arrays", durationMin: 72, daysAgo: 2, hourOfDay: 16 },
  { category: "arrays", durationMin: 48, daysAgo: 4, hourOfDay: 11 },
  { category: "arrays", durationMin: 65, daysAgo: 7, hourOfDay: 15 },
  { category: "arrays", durationMin: 80, daysAgo: 8, hourOfDay: 10 },
  { category: "arrays", durationMin: 42, daysAgo: 11, hourOfDay: 19 },
  { category: "arrays", durationMin: 60, daysAgo: 14, hourOfDay: 13 },
  { category: "arrays", durationMin: 35, daysAgo: 15, hourOfDay: 21 },
  { category: "arrays", durationMin: 70, daysAgo: 18, hourOfDay: 16 },
  { category: "arrays", durationMin: 55, daysAgo: 21, hourOfDay: 12 },
  { category: "arrays", durationMin: 45, daysAgo: 22, hourOfDay: 17 },
  { category: "arrays", durationMin: 62, daysAgo: 25, hourOfDay: 14 },
  { category: "arrays", durationMin: 38, daysAgo: 28, hourOfDay: 20 },
  { category: "arrays", durationMin: 50, daysAgo: 29, hourOfDay: 15 },
  { category: "arrays", durationMin: 44, daysAgo: 31, hourOfDay: 13 },

  // strings — strong (~7.5 hours)
  { category: "strings", durationMin: 40, daysAgo: 2, hourOfDay: 20 },
  { category: "strings", durationMin: 55, daysAgo: 5, hourOfDay: 14 },
  { category: "strings", durationMin: 30, daysAgo: 8, hourOfDay: 22 },
  { category: "strings", durationMin: 50, daysAgo: 12, hourOfDay: 11 },
  { category: "strings", durationMin: 45, daysAgo: 15, hourOfDay: 16 },
  { category: "strings", durationMin: 60, daysAgo: 18, hourOfDay: 19 },
  { category: "strings", durationMin: 35, daysAgo: 22, hourOfDay: 13 },
  { category: "strings", durationMin: 48, daysAgo: 25, hourOfDay: 15 },
  { category: "strings", durationMin: 32, daysAgo: 29, hourOfDay: 17 },
  { category: "strings", durationMin: 52, daysAgo: 32, hourOfDay: 14 },

  // logic — moderate (~5 hours)
  { category: "logic", durationMin: 35, daysAgo: 3, hourOfDay: 18 },
  { category: "logic", durationMin: 42, daysAgo: 6, hourOfDay: 13 },
  { category: "logic", durationMin: 28, daysAgo: 9, hourOfDay: 11 },
  { category: "logic", durationMin: 50, daysAgo: 13, hourOfDay: 16 },
  { category: "logic", durationMin: 38, daysAgo: 17, hourOfDay: 20 },
  { category: "logic", durationMin: 45, daysAgo: 20, hourOfDay: 15 },
  { category: "logic", durationMin: 30, daysAgo: 24, hourOfDay: 12 },
  { category: "logic", durationMin: 40, daysAgo: 27, hourOfDay: 19 },

  // searching — moderate (~4 hours)
  { category: "searching", durationMin: 30, daysAgo: 4, hourOfDay: 14 },
  { category: "searching", durationMin: 45, daysAgo: 7, hourOfDay: 21 },
  { category: "searching", durationMin: 28, daysAgo: 11, hourOfDay: 10 },
  { category: "searching", durationMin: 40, daysAgo: 16, hourOfDay: 18 },
  { category: "searching", durationMin: 35, daysAgo: 19, hourOfDay: 15 },
  { category: "searching", durationMin: 32, daysAgo: 23, hourOfDay: 13 },
  { category: "searching", durationMin: 42, daysAgo: 26, hourOfDay: 17 },

  // math — low (~3 hours)
  { category: "math", durationMin: 25, daysAgo: 5, hourOfDay: 20 },
  { category: "math", durationMin: 30, daysAgo: 9, hourOfDay: 12 },
  { category: "math", durationMin: 40, daysAgo: 14, hourOfDay: 16 },
  { category: "math", durationMin: 22, daysAgo: 18, hourOfDay: 11 },
  { category: "math", durationMin: 35, daysAgo: 23, hourOfDay: 19 },
  { category: "math", durationMin: 28, daysAgo: 28, hourOfDay: 14 },

  // sorting — low (~2.5 hours)
  { category: "sorting", durationMin: 35, daysAgo: 6, hourOfDay: 15 },
  { category: "sorting", durationMin: 20, daysAgo: 12, hourOfDay: 18 },
  { category: "sorting", durationMin: 40, daysAgo: 19, hourOfDay: 13 },
  { category: "sorting", durationMin: 25, daysAgo: 24, hourOfDay: 20 },
  { category: "sorting", durationMin: 30, daysAgo: 30, hourOfDay: 11 },

  // stacks — weakest (~2 hours)
  { category: "stacks", durationMin: 25, daysAgo: 10, hourOfDay: 17 },
  { category: "stacks", durationMin: 30, daysAgo: 17, hourOfDay: 14 },
  { category: "stacks", durationMin: 35, daysAgo: 24, hourOfDay: 20 },
  { category: "stacks", durationMin: 28, daysAgo: 31, hourOfDay: 12 },
];

// Completed matches spread across languages and outcomes.
// Python: 7W-3L (best), C++: 3W-3L, Java: 1W-3L
const MATCH_PLAN: MatchPlanEntry[] = [
  // Python — strong (7W, 3L)
  { language: "python", problemTitle: "Two Sum", myPassed: 7, oppPassed: 5, totalTests: 7, daysAgo: 1, outcome: "win" },
  { language: "python", problemTitle: "Reverse String", myPassed: 7, oppPassed: 4, totalTests: 7, daysAgo: 3, outcome: "win" },
  { language: "python", problemTitle: "Max of Array", myPassed: 7, oppPassed: 7, totalTests: 7, daysAgo: 5, outcome: "win" },
  { language: "python", problemTitle: "Palindrome Check", myPassed: 8, oppPassed: 6, totalTests: 8, daysAgo: 7, outcome: "win" },
  { language: "python", problemTitle: "FizzBuzz", myPassed: 7, oppPassed: 3, totalTests: 7, daysAgo: 10, outcome: "win" },
  { language: "python", problemTitle: "Count Vowels", myPassed: 7, oppPassed: 5, totalTests: 7, daysAgo: 13, outcome: "win" },
  { language: "python", problemTitle: "Two Sum", myPassed: 7, oppPassed: 6, totalTests: 7, daysAgo: 16, outcome: "win" },
  { language: "python", problemTitle: "Binary Search", myPassed: 4, oppPassed: 8, totalTests: 8, daysAgo: 19, outcome: "loss" },
  { language: "python", problemTitle: "Fibonacci", myPassed: 3, oppPassed: 7, totalTests: 7, daysAgo: 22, outcome: "loss" },
  { language: "python", problemTitle: "Sort Array", myPassed: 2, oppPassed: 7, totalTests: 7, daysAgo: 26, outcome: "loss" },

  // C++ — balanced (3W, 3L)
  { language: "cpp", problemTitle: "Max of Array", myPassed: 7, oppPassed: 5, totalTests: 7, daysAgo: 4, outcome: "win" },
  { language: "cpp", problemTitle: "Reverse String", myPassed: 7, oppPassed: 4, totalTests: 7, daysAgo: 9, outcome: "win" },
  { language: "cpp", problemTitle: "FizzBuzz", myPassed: 7, oppPassed: 6, totalTests: 7, daysAgo: 14, outcome: "win" },
  { language: "cpp", problemTitle: "Binary Search", myPassed: 5, oppPassed: 8, totalTests: 8, daysAgo: 17, outcome: "loss" },
  { language: "cpp", problemTitle: "Valid Parentheses", myPassed: 3, oppPassed: 8, totalTests: 8, daysAgo: 21, outcome: "loss" },
  { language: "cpp", problemTitle: "Sort Array", myPassed: 4, oppPassed: 7, totalTests: 7, daysAgo: 27, outcome: "loss" },

  // Java — weakest (1W, 3L)
  { language: "java", problemTitle: "Count Vowels", myPassed: 7, oppPassed: 4, totalTests: 7, daysAgo: 6, outcome: "win" },
  { language: "java", problemTitle: "Two Sum", myPassed: 4, oppPassed: 7, totalTests: 7, daysAgo: 11, outcome: "loss" },
  { language: "java", problemTitle: "Palindrome Check", myPassed: 3, oppPassed: 8, totalTests: 8, daysAgo: 18, outcome: "loss" },
  { language: "java", problemTitle: "Fibonacci", myPassed: 2, oppPassed: 7, totalTests: 7, daysAgo: 24, outcome: "loss" },
];

function dateDaysAgo(daysAgo: number, hourOfDay = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hourOfDay, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

async function main() {
  const me = await prisma.user.findUnique({ where: { username: JAHSHOEAH_USERNAME } });
  if (!me) throw new Error(`User ${JAHSHOEAH_USERNAME} not found.`);
  console.log(`Found ${JAHSHOEAH_USERNAME}: ${me.id} (ELO ${me.elo})`);

  // --- Wipe existing focus/match data for this user so the script is idempotent.
  const deletedFocus = await prisma.focusSession.deleteMany({ where: { userId: me.id } });
  console.log(`Cleared ${deletedFocus.count} existing focus sessions.`);

  const existingParticipations = await prisma.matchParticipant.findMany({
    where: { userId: me.id, language: { not: null } },
    select: { matchId: true },
  });
  const populatedMatchIds = existingParticipations.map((p) => p.matchId);
  if (populatedMatchIds.length > 0) {
    // Delete the matches (and participants cascade)
    const deletedMatches = await prisma.match.deleteMany({
      where: { id: { in: populatedMatchIds } },
    });
    console.log(`Cleared ${deletedMatches.count} previously-populated matches.`);
  }

  // --- Insert focus sessions.
  const focusRows = FOCUS_PLAN.map((entry) => ({
    userId: me.id,
    category: entry.category,
    durationMs: entry.durationMin * 60 * 1000,
    date: dateDaysAgo(entry.daysAgo, entry.hourOfDay),
  }));
  await prisma.focusSession.createMany({ data: focusRows });
  console.log(`Inserted ${focusRows.length} focus sessions.`);

  // --- Pick opponents. Use BoilerMaker bots so opponents vary per match.
  const opponents = await prisma.user.findMany({
    where: { username: { startsWith: "BoilerMaker" } },
    select: { id: true, username: true, elo: true },
    take: 20,
  });
  if (opponents.length === 0) throw new Error("No BoilerMaker opponents found.");

  // --- Build problem lookup (one problem id per title).
  const problems = await prisma.problem.findMany({
    where: {
      title: { in: Array.from(new Set(MATCH_PLAN.map((m) => m.problemTitle))) },
    },
    select: { id: true, title: true },
  });
  const problemByTitle = new Map<string, string>();
  for (const p of problems) {
    if (!problemByTitle.has(p.title)) problemByTitle.set(p.title, p.id);
  }

  // --- Insert matches.
  let created = 0;
  for (let i = 0; i < MATCH_PLAN.length; i++) {
    const entry = MATCH_PLAN[i];
    const problemId = problemByTitle.get(entry.problemTitle);
    if (!problemId) {
      console.warn(`Skipping ${entry.problemTitle} — problem not found`);
      continue;
    }
    const opponent = opponents[i % opponents.length];
    const startedAt = dateDaysAgo(entry.daysAgo, 15);
    const durationSec = 600 + Math.floor(Math.random() * 900); // 10–25 min
    const endedAt = new Date(startedAt.getTime() + durationSec * 1000);

    const myReached =
      entry.myPassed > 0 ? new Date(startedAt.getTime() + (durationSec - 30) * 1000) : null;
    const oppReached =
      entry.oppPassed > 0 ? new Date(startedAt.getTime() + (durationSec - 60) * 1000) : null;

    // On a tie, ensure my reachedPassedAt < opp's if I should win, and vice versa.
    let myReachedFinal = myReached;
    let oppReachedFinal = oppReached;
    if (entry.myPassed === entry.oppPassed && entry.myPassed > 0) {
      if (entry.outcome === "win") {
        myReachedFinal = new Date(startedAt.getTime() + (durationSec - 60) * 1000);
        oppReachedFinal = new Date(startedAt.getTime() + (durationSec - 30) * 1000);
      } else if (entry.outcome === "loss") {
        myReachedFinal = new Date(startedAt.getTime() + (durationSec - 30) * 1000);
        oppReachedFinal = new Date(startedAt.getTime() + (durationSec - 60) * 1000);
      }
    }

    // ELO deltas reflect outcome.
    const myEloDelta = entry.outcome === "win" ? 12 : entry.outcome === "loss" ? -12 : 0;
    const oppEloDelta = -myEloDelta;

    await prisma.match.create({
      data: {
        mode: MatchMode.RANKED,
        status: MatchStatus.COMPLETED,
        problemId,
        startedAt,
        endedAt,
        durationSec,
        createdAt: startedAt,
        participants: {
          create: [
            {
              userId: me.id,
              startElo: me.elo - myEloDelta,
              endElo: me.elo,
              passedCount: entry.myPassed,
              language: entry.language,
              reachedPassedAt: myReachedFinal,
            },
            {
              userId: opponent.id,
              startElo: opponent.elo - oppEloDelta,
              endElo: opponent.elo,
              passedCount: entry.oppPassed,
              language: ["python", "cpp", "java"][(i + 1) % 3],
              reachedPassedAt: oppReachedFinal,
            },
          ],
        },
      },
    });
    created++;
  }
  console.log(`Inserted ${created} completed matches.`);

  // --- Summary.
  const focusByCategory = await prisma.focusSession.groupBy({
    by: ["category"],
    where: { userId: me.id },
    _sum: { durationMs: true },
  });
  console.log("\nFocus time by category (hours):");
  for (const row of focusByCategory) {
    const hrs = (row._sum.durationMs ?? 0) / (1000 * 60 * 60);
    console.log(`  ${row.category.padEnd(12)} ${hrs.toFixed(2)}`);
  }

  const langs = await prisma.matchParticipant.groupBy({
    by: ["language"],
    where: { userId: me.id, language: { not: null } },
    _count: { _all: true },
    _sum: { passedCount: true },
  });
  console.log("\nMatches and passed tests by language:");
  for (const row of langs) {
    console.log(
      `  ${(row.language ?? "?").padEnd(8)} matches=${row._count._all} passed=${row._sum.passedCount}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
