import { describe, it, expect, beforeEach, jest, afterAll } from "@jest/globals";
import { AchievementType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Mock Prisma client (CJS-style) before any imports that use it
// ---------------------------------------------------------------------------
const mockPrisma = {
  userAchievement: {
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
  },
  matchParticipant: {
    findMany: jest.fn<any>(),
    count: jest.fn<any>(),
  },
  submission: {
    findFirst: jest.fn<any>(),
    findMany: jest.fn<any>(),
  },
  user: {
    findUnique: jest.fn<any>(),
    count: jest.fn<any>(),
  },
  $disconnect: jest.fn<any>(),
};

jest.mock("../db/client", () => ({
  prisma: mockPrisma,
}));

import {
  getUserAchievements,
  awardAchievement,
  hasAchievement,
  checkAndAwardAchievements,
  ACHIEVEMENT_META,
} from "../db/achievement-repo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const USER_A = "user-a-id";
const USER_B = "user-b-id";

function baseCtx(overrides: Record<string, unknown> = {}) {
  return {
    matchId: "match-1",
    winnerUserId: USER_A,
    participants: [
      { userId: USER_A, startElo: 1200, endElo: 1220, passedCount: 5 },
      { userId: USER_B, startElo: 1200, endElo: 1180, passedCount: 3 },
    ],
    totalTestCases: 5,
    matchStartedAt: new Date("2026-04-23T10:00:00Z"),
    matchMode: "RANKED",
    ...overrides,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

/** Stub "no existing achievement" for all achievement types */
function stubNoExistingAchievements() {
  mockPrisma.userAchievement.findUnique.mockResolvedValue(null);
  mockPrisma.userAchievement.create.mockImplementation(async ({ data }: any) => ({
    id: "ach-new",
    userId: data.userId,
    type: data.type,
    earnedAt: new Date(),
  }));
}

/** Stub that user already has a specific achievement */
function stubHasAchievement(type: AchievementType) {
  mockPrisma.userAchievement.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.userId_type?.type === type) {
      return { id: "ach-existing", userId: where.userId_type.userId, type, earnedAt: new Date() };
    }
    return null;
  });
}

// ===========================================================================
// AC1: Given I complete a specific milestone, the corresponding achievement
//      is unlocked on my profile.
// ===========================================================================
describe("Sprint 3 User Story 2 - Achievements", () => {
  describe("AC1: Milestone-based achievement unlocking", () => {
    // -----------------------------------------------------------------------
    // FIRST_BLOOD
    // -----------------------------------------------------------------------
    describe("First Blood — Win your first 1v1 match", () => {
      it("awards FIRST_BLOOD when user wins their first match", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          {
            userId: USER_A,
            passedCount: 5,
            match: {
              participants: [
                { userId: USER_A, passedCount: 5 },
                { userId: USER_B, passedCount: 3 },
              ],
            },
          },
        ]);
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).toContain(AchievementType.FIRST_BLOOD);
      });

      it("does not award FIRST_BLOOD to the loser", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockResolvedValue([]);
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1180 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_B, baseCtx());
        expect(result).not.toContain(AchievementType.FIRST_BLOOD);
      });

      it("does not duplicate FIRST_BLOOD if already earned", async () => {
        stubHasAchievement(AchievementType.FIRST_BLOOD);
        mockPrisma.matchParticipant.findMany.mockResolvedValue([]);
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(5);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).not.toContain(AchievementType.FIRST_BLOOD);
      });
    });

    // -----------------------------------------------------------------------
    // WIN_STREAK_X3
    // -----------------------------------------------------------------------
    describe("Win Streak x3 — Win 3 ranked matches in a row", () => {
      it("awards WIN_STREAK_X3 when last 3 ranked matches are wins", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockImplementation(async ({ where }: any) => {
          if (where?.match?.mode === "RANKED") {
            return [
              { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
              { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 2 }] } },
              { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 1 }] } },
            ];
          }
          return [
            { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
          ];
        });
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).toContain(AchievementType.WIN_STREAK_X3);
      });

      it("does not award WIN_STREAK_X3 for FFA mode matches", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockResolvedValue([]);
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx({ matchMode: "FFA" }));
        expect(result).not.toContain(AchievementType.WIN_STREAK_X3);
      });

      it("does not award WIN_STREAK_X3 if fewer than 3 ranked matches", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockImplementation(async ({ where }: any) => {
          if (where?.match?.mode === "RANKED") {
            return [
              { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
              { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 2 }] } },
            ];
          }
          return [
            { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
          ];
        });
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).not.toContain(AchievementType.WIN_STREAK_X3);
      });
    });

    // -----------------------------------------------------------------------
    // UNDERDOG
    // -----------------------------------------------------------------------
    describe("Underdog — Beat a player with higher Elo", () => {
      it("awards UNDERDOG when winner had lower startElo", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1120 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const ctx = baseCtx({
          participants: [
            { userId: USER_A, startElo: 1100, endElo: 1120, passedCount: 5 },
            { userId: USER_B, startElo: 1300, endElo: 1280, passedCount: 3 },
          ],
        });

        const result = await checkAndAwardAchievements(USER_A, ctx);
        expect(result).toContain(AchievementType.UNDERDOG);
      });

      it("does not award UNDERDOG when winner had equal or higher Elo", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1320 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const ctx = baseCtx({
          participants: [
            { userId: USER_A, startElo: 1300, endElo: 1320, passedCount: 5 },
            { userId: USER_B, startElo: 1100, endElo: 1080, passedCount: 3 },
          ],
        });

        const result = await checkAndAwardAchievements(USER_A, ctx);
        expect(result).not.toContain(AchievementType.UNDERDOG);
      });
    });

    // -----------------------------------------------------------------------
    // SPEED_CODER
    // -----------------------------------------------------------------------
    describe("Speed Coder — Submit a correct solution in under 5 minutes", () => {
      it("awards SPEED_CODER when all-pass submission within 5 min", async () => {
        stubNoExistingAchievements();
        const matchStart = new Date("2026-04-23T10:00:00Z");
        const subTime = new Date("2026-04-23T10:04:30Z");

        mockPrisma.submission.findFirst.mockResolvedValue({
          id: "sub-1",
          matchId: "match-1",
          userId: USER_A,
          passedCount: 5,
          status: "COMPLETED",
          createdAt: subTime,
        });
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx({ matchStartedAt: matchStart }));
        expect(result).toContain(AchievementType.SPEED_CODER);
      });

      it("does not award SPEED_CODER when submission took > 5 minutes", async () => {
        stubNoExistingAchievements();
        const matchStart = new Date("2026-04-23T10:00:00Z");
        const subTime = new Date("2026-04-23T10:06:00Z");

        mockPrisma.submission.findFirst.mockResolvedValue({
          id: "sub-1",
          matchId: "match-1",
          userId: USER_A,
          passedCount: 5,
          status: "COMPLETED",
          createdAt: subTime,
        });
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx({ matchStartedAt: matchStart }));
        expect(result).not.toContain(AchievementType.SPEED_CODER);
      });

      it("does not award SPEED_CODER if no all-pass submission exists", async () => {
        stubNoExistingAchievements();
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.matchParticipant.findMany.mockResolvedValue([]);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1180 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_B, baseCtx());
        expect(result).not.toContain(AchievementType.SPEED_CODER);
      });
    });

    // -----------------------------------------------------------------------
    // PERFECT_RUN
    // -----------------------------------------------------------------------
    describe("Perfect Run — Pass all test cases on first submission", () => {
      it("awards PERFECT_RUN when first submission passes all tests", async () => {
        stubNoExistingAchievements();
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockImplementation(async ({ where }: any) => {
          if (where?.userId === USER_A && where?.matchId === "match-1") {
            return [{ passedCount: 5, createdAt: new Date(), status: "COMPLETED" }];
          }
          return [];
        });
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).toContain(AchievementType.PERFECT_RUN);
      });

      it("does not award PERFECT_RUN if first submission did not pass all tests", async () => {
        stubNoExistingAchievements();
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockImplementation(async ({ where }: any) => {
          if (where?.userId === USER_A && where?.matchId === "match-1") {
            return [
              { passedCount: 3, createdAt: new Date("2026-04-23T10:01:00Z"), status: "COMPLETED" },
              { passedCount: 5, createdAt: new Date("2026-04-23T10:05:00Z"), status: "COMPLETED" },
            ];
          }
          return [];
        });
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).not.toContain(AchievementType.PERFECT_RUN);
      });
    });

    // -----------------------------------------------------------------------
    // COMEBACK_KING
    // -----------------------------------------------------------------------
    describe("Comeback King — Win after trailing in passed test cases", () => {
      it("awards COMEBACK_KING when user trailed then won", async () => {
        stubNoExistingAchievements();
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockImplementation(async ({ where }: any) => {
          // All submissions for match (comeback check)
          if (where?.matchId === "match-1" && !where?.userId) {
            return [
              { userId: USER_B, passedCount: 3, createdAt: new Date("2026-04-23T10:02:00Z"), status: "COMPLETED" },
              { userId: USER_A, passedCount: 2, createdAt: new Date("2026-04-23T10:03:00Z"), status: "COMPLETED" },
              { userId: USER_A, passedCount: 5, createdAt: new Date("2026-04-23T10:05:00Z"), status: "COMPLETED" },
            ];
          }
          // Perfect run check for user A
          if (where?.userId === USER_A) {
            return [
              { passedCount: 2, createdAt: new Date("2026-04-23T10:03:00Z"), status: "COMPLETED" },
              { passedCount: 5, createdAt: new Date("2026-04-23T10:05:00Z"), status: "COMPLETED" },
            ];
          }
          return [];
        });
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).toContain(AchievementType.COMEBACK_KING);
      });

      it("does not award COMEBACK_KING if user was never trailing", async () => {
        stubNoExistingAchievements();
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockImplementation(async ({ where }: any) => {
          if (where?.matchId === "match-1" && !where?.userId) {
            return [
              { userId: USER_A, passedCount: 3, createdAt: new Date("2026-04-23T10:02:00Z"), status: "COMPLETED" },
              { userId: USER_B, passedCount: 2, createdAt: new Date("2026-04-23T10:03:00Z"), status: "COMPLETED" },
              { userId: USER_A, passedCount: 5, createdAt: new Date("2026-04-23T10:05:00Z"), status: "COMPLETED" },
            ];
          }
          if (where?.userId === USER_A) {
            return [
              { passedCount: 3, createdAt: new Date("2026-04-23T10:02:00Z"), status: "COMPLETED" },
              { passedCount: 5, createdAt: new Date("2026-04-23T10:05:00Z"), status: "COMPLETED" },
            ];
          }
          return [];
        });
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 2 }] } },
        ]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).not.toContain(AchievementType.COMEBACK_KING);
      });
    });

    // -----------------------------------------------------------------------
    // POLYGLOT
    // -----------------------------------------------------------------------
    describe("Polyglot — Win matches using 3 different languages", () => {
      it("awards POLYGLOT when user has won with 3+ languages", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockImplementation(async ({ where }: any) => {
          if (where?.language) {
            return [
              { userId: USER_A, language: "python", passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
              { userId: USER_A, language: "cpp", passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 2 }] } },
              { userId: USER_A, language: "java", passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 1 }] } },
            ];
          }
          return [
            { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
          ];
        });
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).toContain(AchievementType.POLYGLOT);
      });

      it("does not award POLYGLOT with fewer than 3 languages", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockImplementation(async ({ where }: any) => {
          if (where?.language) {
            return [
              { userId: USER_A, language: "python", passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
              { userId: USER_A, language: "cpp", passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 2 }] } },
            ];
          }
          return [
            { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
          ];
        });
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).not.toContain(AchievementType.POLYGLOT);
      });
    });

    // -----------------------------------------------------------------------
    // DAILY_GRINDER
    // -----------------------------------------------------------------------
    describe("Daily Grinder — Play 5 matches in one day", () => {
      it("awards DAILY_GRINDER when 5+ matches completed today", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.matchParticipant.count.mockResolvedValue(5);
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).toContain(AchievementType.DAILY_GRINDER);
      });

      it("does not award DAILY_GRINDER with fewer than 5 matches today", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.matchParticipant.count.mockResolvedValue(3);
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).not.toContain(AchievementType.DAILY_GRINDER);
      });
    });

    // -----------------------------------------------------------------------
    // TOP_100
    // -----------------------------------------------------------------------
    describe("Top 100 — Reach top 100 on leaderboard", () => {
      it("awards TOP_100 when user is in top 100", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1500 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).toContain(AchievementType.TOP_100);
      });

      it("does not award TOP_100 if position > 100", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1000 });
        mockPrisma.user.count.mockResolvedValue(150);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).not.toContain(AchievementType.TOP_100);
      });
    });

    // -----------------------------------------------------------------------
    // LEGEND
    // -----------------------------------------------------------------------
    describe("Legend — Reach 2000+ Elo", () => {
      it("awards LEGEND when endElo >= 2000", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 2010 });
        mockPrisma.user.count.mockResolvedValue(5);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const ctx = baseCtx({
          participants: [
            { userId: USER_A, startElo: 1990, endElo: 2010, passedCount: 5 },
            { userId: USER_B, startElo: 1200, endElo: 1180, passedCount: 3 },
          ],
        });

        const result = await checkAndAwardAchievements(USER_A, ctx);
        expect(result).toContain(AchievementType.LEGEND);
      });

      it("does not award LEGEND when endElo < 2000", async () => {
        stubNoExistingAchievements();
        mockPrisma.matchParticipant.findMany.mockResolvedValue([
          { userId: USER_A, passedCount: 5, match: { participants: [{ userId: USER_A, passedCount: 5 }, { userId: USER_B, passedCount: 3 }] } },
        ]);
        mockPrisma.submission.findFirst.mockResolvedValue(null);
        mockPrisma.submission.findMany.mockResolvedValue([]);
        mockPrisma.user.findUnique.mockResolvedValue({ elo: 1220 });
        mockPrisma.user.count.mockResolvedValue(50);
        mockPrisma.matchParticipant.count.mockResolvedValue(1);

        const result = await checkAndAwardAchievements(USER_A, baseCtx());
        expect(result).not.toContain(AchievementType.LEGEND);
      });
    });
  });

  // ===========================================================================
  // AC2: Given I have earned multiple achievements, when I view my public
  //      profile, then all earned badges are displayed.
  // ===========================================================================
  describe("AC2: All earned badges displayed on public profile", () => {
    it("returns all earned achievements for a user", async () => {
      const earnedAt = new Date("2026-04-20T12:00:00Z");
      mockPrisma.userAchievement.findMany.mockResolvedValue([
        { id: "ach-1", userId: USER_A, type: AchievementType.FIRST_BLOOD, earnedAt },
        { id: "ach-2", userId: USER_A, type: AchievementType.UNDERDOG, earnedAt },
        { id: "ach-3", userId: USER_A, type: AchievementType.LEGEND, earnedAt },
      ]);

      const achievements = await getUserAchievements(USER_A);
      expect(achievements).toHaveLength(3);

      const types = achievements.map((a) => a.type);
      expect(types).toContain(AchievementType.FIRST_BLOOD);
      expect(types).toContain(AchievementType.UNDERDOG);
      expect(types).toContain(AchievementType.LEGEND);
    });

    it("returns empty array if user has no achievements", async () => {
      mockPrisma.userAchievement.findMany.mockResolvedValue([]);
      const achievements = await getUserAchievements(USER_A);
      expect(achievements).toHaveLength(0);
    });

    it("each achievement includes id, type, name, description, and earnedAt", async () => {
      const earnedAt = new Date("2026-04-20T12:00:00Z");
      mockPrisma.userAchievement.findMany.mockResolvedValue([
        { id: "ach-1", userId: USER_A, type: AchievementType.FIRST_BLOOD, earnedAt },
      ]);

      const achievements = await getUserAchievements(USER_A);
      const a = achievements[0];

      expect(a.id).toBe("ach-1");
      expect(a.type).toBe(AchievementType.FIRST_BLOOD);
      expect(a.name).toBe("First Blood");
      expect(a.description).toBe("Win your first 1v1 match.");
      expect(a.earnedAt).toBe(earnedAt.toISOString());
    });
  });

  // ===========================================================================
  // AC3: Given I hover over a badge, when the tooltip appears, it displays
  //      the name and earned date.
  // ===========================================================================
  describe("AC3: Badge tooltip data — name and earned date", () => {
    it("every achievement type has name and description in ACHIEVEMENT_META", () => {
      const allTypes = Object.values(AchievementType);
      for (const type of allTypes) {
        const meta = ACHIEVEMENT_META[type];
        expect(meta).toBeDefined();
        expect(typeof meta.name).toBe("string");
        expect(meta.name.length).toBeGreaterThan(0);
        expect(typeof meta.description).toBe("string");
        expect(meta.description.length).toBeGreaterThan(0);
      }
    });

    it("getUserAchievements returns name and earnedAt for tooltip display", async () => {
      const earnedAt = new Date("2026-04-15T08:30:00Z");
      mockPrisma.userAchievement.findMany.mockResolvedValue([
        { id: "ach-1", userId: USER_A, type: AchievementType.SPEED_CODER, earnedAt },
      ]);

      const achievements = await getUserAchievements(USER_A);
      expect(achievements[0].name).toBe("Speed Coder");
      expect(achievements[0].earnedAt).toBe("2026-04-15T08:30:00.000Z");
    });

    it("earnedAt is a valid ISO 8601 date string", async () => {
      const earnedAt = new Date("2026-04-10T20:00:00Z");
      mockPrisma.userAchievement.findMany.mockResolvedValue([
        { id: "ach-1", userId: USER_A, type: AchievementType.POLYGLOT, earnedAt },
      ]);

      const achievements = await getUserAchievements(USER_A);
      const parsed = new Date(achievements[0].earnedAt);
      expect(parsed.toISOString()).toBe(achievements[0].earnedAt);
    });

    it("ACHIEVEMENT_META covers all 10 defined achievements", () => {
      const expectedNames = [
        "First Blood", "Win Streak x3", "Underdog", "Speed Coder",
        "Perfect Run", "Comeback King", "Polyglot", "Daily Grinder",
        "Top 100", "Legend",
      ];
      const actualNames = Object.values(ACHIEVEMENT_META).map((m) => m.name);
      for (const name of expectedNames) {
        expect(actualNames).toContain(name);
      }
    });
  });

  // ===========================================================================
  // Idempotency: achievements cannot be double-awarded
  // ===========================================================================
  describe("Idempotency — achievements are not duplicated", () => {
    it("awardAchievement returns false if already earned", async () => {
      mockPrisma.userAchievement.findUnique.mockResolvedValue({
        id: "ach-1",
        userId: USER_A,
        type: AchievementType.FIRST_BLOOD,
        earnedAt: new Date(),
      });

      const result = await awardAchievement(USER_A, AchievementType.FIRST_BLOOD);
      expect(result).toBe(false);
      expect(mockPrisma.userAchievement.create).not.toHaveBeenCalled();
    });

    it("awardAchievement returns true on first award", async () => {
      mockPrisma.userAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.userAchievement.create.mockResolvedValue({
        id: "ach-new",
        userId: USER_A,
        type: AchievementType.FIRST_BLOOD,
        earnedAt: new Date(),
      });

      const result = await awardAchievement(USER_A, AchievementType.FIRST_BLOOD);
      expect(result).toBe(true);
      expect(mockPrisma.userAchievement.create).toHaveBeenCalledTimes(1);
    });

    it("hasAchievement returns true when achievement exists", async () => {
      mockPrisma.userAchievement.findUnique.mockResolvedValue({
        id: "ach-1",
        userId: USER_A,
        type: AchievementType.LEGEND,
        earnedAt: new Date(),
      });

      const result = await hasAchievement(USER_A, AchievementType.LEGEND);
      expect(result).toBe(true);
    });

    it("hasAchievement returns false when achievement does not exist", async () => {
      mockPrisma.userAchievement.findUnique.mockResolvedValue(null);

      const result = await hasAchievement(USER_A, AchievementType.LEGEND);
      expect(result).toBe(false);
    });
  });
});
