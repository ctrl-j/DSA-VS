import { MatchMode, MatchStatus } from "@prisma/client";
import { prisma } from "../src/db/client";
import { hash } from "bcrypt";
import { SALT_ROUNDS } from "../src/db/common";

const NUM_USERS = 100;
const PASSWORD = "BoilerUp!2026";

// Deterministic ELO distribution from 800 to 1400.
// Users 50 and 51 will share the same ELO (1050) to demonstrate the tiebreaker.
function eloForIndex(i: number): number {
  if (i === 50) return 1050; // tiebreaker pair A
  if (i === 51) return 1050; // tiebreaker pair B — same ELO, different win rate

  // Spread the remaining 98 users across 800–1400
  // Skip index 50/51 in the mapping to keep it simple
  const slot = i < 50 ? i : i > 51 ? i - 2 : i;
  // 98 slots → 600 range
  return 800 + Math.round((slot / 97) * 600);
}

async function main() {
  const passwordHash = await hash(PASSWORD, SALT_ROUNDS);

  // -----------------------------------------------------------------------
  // 1. Create 100 users
  // -----------------------------------------------------------------------
  console.log("Creating 100 BoilerMaker users (ELO 800–1400)…");

  const users: Array<{ id: string; username: string; elo: number }> = [];

  for (let i = 1; i <= NUM_USERS; i++) {
    const elo = eloForIndex(i);
    const user = await prisma.user.create({
      data: {
        username: `BoilerMaker${i}`,
        passwordHash,
        elo,
      },
      select: { id: true, username: true, elo: true },
    });
    users.push(user);
  }

  console.log(`  ✓ Created ${users.length} users`);

  // -----------------------------------------------------------------------
  // 2. Grab a problem to attach to matches (any active one)
  // -----------------------------------------------------------------------
  const problem = await prisma.problem.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  const problemId = problem?.id ?? null;

  // -----------------------------------------------------------------------
  // 3. Helper: create a completed match between two users
  // -----------------------------------------------------------------------
  async function createCompletedMatch(
    userA: { id: string; elo: number },
    userB: { id: string; elo: number },
    winnerPassedCount: number,
    loserPassedCount: number,
    winnerId: string
  ) {
    const aIsWinner = winnerId === userA.id;
    const startedAt = new Date(Date.now() - 30 * 60_000); // 30 min ago
    const endedAt = new Date(Date.now() - 5 * 60_000); // 5 min ago

    await prisma.match.create({
      data: {
        mode: MatchMode.RANKED,
        status: MatchStatus.COMPLETED,
        problemId,
        startedAt,
        endedAt,
        durationSec: 1500,
        participants: {
          create: [
            {
              userId: userA.id,
              startElo: userA.elo,
              endElo: userA.elo,
              passedCount: aIsWinner ? winnerPassedCount : loserPassedCount,
              reachedPassedAt: aIsWinner
                ? new Date(startedAt.getTime() + 5 * 60_000)
                : new Date(startedAt.getTime() + 10 * 60_000),
            },
            {
              userId: userB.id,
              startElo: userB.elo,
              endElo: userB.elo,
              passedCount: aIsWinner ? loserPassedCount : winnerPassedCount,
              reachedPassedAt: aIsWinner
                ? new Date(startedAt.getTime() + 10 * 60_000)
                : new Date(startedAt.getTime() + 5 * 60_000),
            },
          ],
        },
      },
    });
  }

  // -----------------------------------------------------------------------
  // 4. Create match history for every user so they each have a win rate
  //    Pair adjacent users and play 2–4 matches between each pair.
  // -----------------------------------------------------------------------
  console.log("Creating match history…");

  let matchCount = 0;

  // Seed a simple PRNG for reproducibility
  let rngState = 42;
  function nextRng() {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState;
  }

  for (let i = 0; i < users.length - 1; i += 2) {
    const a = users[i];
    const b = users[i + 1];
    const numMatches = 2 + (nextRng() % 3); // 2, 3, or 4 matches

    for (let m = 0; m < numMatches; m++) {
      // Higher ELO user wins more often, but not always
      const aWins = nextRng() % 100 < 50 + (a.elo - b.elo) / 10;
      const winnerId = aWins ? a.id : b.id;
      await createCompletedMatch(a, b, 7, nextRng() % 5, winnerId);
      matchCount++;
    }
  }

  // -----------------------------------------------------------------------
  // 5. Tiebreaker pair: BoilerMaker50 (index 49) and BoilerMaker51 (index 50)
  //    Both at ELO 1050. Give BoilerMaker50 a better win rate.
  //    BoilerMaker50: 4 wins / 5 matches = 80%
  //    BoilerMaker51: 2 wins / 5 matches = 40%
  //    So BoilerMaker50 should rank higher on the leaderboard despite same ELO.
  // -----------------------------------------------------------------------
  console.log("Setting up tiebreaker pair (BoilerMaker50 vs BoilerMaker51)…");

  const tieA = users[49]; // BoilerMaker50
  const tieB = users[50]; // BoilerMaker51

  // We need opponents for these extra matches. Pick some other users.
  const opponents = [users[10], users[20], users[30], users[40], users[60]];

  // BoilerMaker50 wins 4, loses 1
  for (let i = 0; i < 5; i++) {
    const opp = opponents[i];
    const boilerWins = i < 4; // first 4 are wins, last is a loss
    await createCompletedMatch(
      tieA,
      opp,
      7,
      boilerWins ? 3 : 7,
      boilerWins ? tieA.id : opp.id
    );
    matchCount++;
  }

  // BoilerMaker51 wins 2, loses 3
  for (let i = 0; i < 5; i++) {
    const opp = opponents[i];
    const boilerWins = i < 2; // first 2 are wins, last 3 are losses
    await createCompletedMatch(
      tieB,
      opp,
      7,
      boilerWins ? 3 : 7,
      boilerWins ? tieB.id : opp.id
    );
    matchCount++;
  }

  console.log(`  ✓ Created ${matchCount} matches`);
  console.log(
    `\n  Tiebreaker: BoilerMaker50 and BoilerMaker51 both have ELO 1050.`
  );
  console.log(
    `  BoilerMaker50 should rank higher due to better win rate (~80% vs ~40%).`
  );
  console.log(`\nDone. Seeded ${NUM_USERS} leaderboard users.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
