import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MatchStatus, PrismaClient, Difficulty, MatchMode } from "@prisma/client";
import { mockDeep, mockReset } from "jest-mock-extended";

const prismaMock = mockDeep<PrismaClient>();

jest.mock("@prisma/client", () => {
  const actual = jest.requireActual("@prisma/client") as Record<string, unknown>;
  return {
    ...actual,
    PrismaClient: jest.fn().mockImplementation(() => prismaMock),
  };
});

import * as matchRepo from "./match-repo";

describe("Match Repository", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  describe("findProblemForMatch", () => {
    it("filters by difficulty and category", async () => {
      (prismaMock.problem.findFirst as any).mockResolvedValue({
        id: "p1",
        title: "Two Sum",
        difficulty: Difficulty.EASY,
        category: "Arrays",
      });

      const problem = await matchRepo.findProblemForMatch(Difficulty.EASY, "Arrays");
      expect(problem?.id).toBe("p1");
      expect(prismaMock.problem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            difficulty: Difficulty.EASY,
            category: "Arrays",
          }),
        })
      );
    });
  });

  describe("createMatchForUsers", () => {
    it("creates a match with filtered problem", async () => {
      (prismaMock.problem.findFirst as any).mockResolvedValue({
        id: "p1",
        title: "Two Sum",
      });
      (prismaMock.match.create as any).mockResolvedValue({ id: "m1" });

      await matchRepo.createMatchForUsers(
        { id: "u1", elo: 1000 },
        { id: "u2", elo: 1100 },
        MatchMode.RANKED,
        Difficulty.EASY,
        "Arrays"
      );

      expect(prismaMock.problem.findFirst).toHaveBeenCalled();
      expect(prismaMock.match.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            problemId: "p1",
            mode: MatchMode.RANKED,
          }),
        })
      );
    });
  });

  describe("setMatchParticipantLanguage", () => {
    it("updates language for a participant", async () => {
      (prismaMock.matchParticipant.update as any).mockResolvedValue({});

      await matchRepo.setMatchParticipantLanguage("m1", "u1", "typescript");

      expect(prismaMock.matchParticipant.update).toHaveBeenCalledWith({
        where: {
          matchId_userId: {
            matchId: "m1",
            userId: "u1",
          },
        },
        data: {
          language: "typescript",
        },
      });
    });
  });

  describe("Draft Management", () => {
    it("saves a draft", async () => {
      (prismaMock.draft.upsert as any).mockResolvedValue({});

      await matchRepo.saveDraft("m1", "u1", "const x = 1;");

      expect(prismaMock.draft.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            matchId_userId: {
              matchId: "m1",
              userId: "u1",
            },
          },
          update: { code: "const x = 1;" },
        })
      );
    });

    it("retrieves a draft", async () => {
      (prismaMock.draft.findUnique as any).mockResolvedValue({ code: "const x = 1;" });

      const draft = await matchRepo.getDraft("m1", "u1");
      expect(draft?.code).toBe("const x = 1;");
    });
  });

  describe("completeMatch", () => {
    it("completes a match and updates ELOs", async () => {
      (prismaMock.match.update as any).mockResolvedValue({ id: "m1", status: MatchStatus.COMPLETED });
      (prismaMock.user.update as any).mockResolvedValue({});

      const match = await matchRepo.completeMatch(
        "m1",
        { userId: "u1", endElo: 1050, passedCount: 10 },
        { userId: "u2", endElo: 950, passedCount: 5 }
      );

      expect(match.status).toBe(MatchStatus.COMPLETED);
      expect(prismaMock.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "m1" },
          data: expect.objectContaining({
            status: MatchStatus.COMPLETED,
            participants: expect.objectContaining({
              update: expect.arrayContaining([
                expect.objectContaining({
                  where: { matchId_userId: { matchId: "m1", userId: "u1" } },
                  data: { endElo: 1050, passedCount: 10 },
                }),
                expect.objectContaining({
                  where: { matchId_userId: { matchId: "m1", userId: "u2" } },
                  data: { endElo: 950, passedCount: 5 },
                }),
              ]),
            }),
          }),
        })
      );
      expect(prismaMock.user.update).toHaveBeenCalledTimes(2);
    });
  });

  describe("Submission Management", () => {
    it("creates a submission", async () => {
      (prismaMock.submission.create as any).mockResolvedValue({ id: "s1" });

      const submission = await matchRepo.createSubmission("m1", "u1", "python", "print(1)");

      expect(submission.id).toBe("s1");
      expect(prismaMock.submission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchId: "m1",
          userId: "u1",
          language: "python",
          code: "print(1)",
        }),
      });
    });

    it("updates a submission", async () => {
      (prismaMock.submission.update as any).mockResolvedValue({});

      await matchRepo.updateSubmission("s1", { status: "COMPLETED", passedCount: 8 });

      expect(prismaMock.submission.update).toHaveBeenCalledWith({
        where: { id: "s1" },
        data: { status: "COMPLETED", passedCount: 8 },
      });
    });
  });

  describe("Progress Tracking", () => {
    it("updates match participant progress", async () => {
      (prismaMock.matchParticipant.update as any).mockResolvedValue({});

      await matchRepo.updateMatchParticipantProgress("m1", "u1", 5);

      expect(prismaMock.matchParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            matchId_userId: {
              matchId: "m1",
              userId: "u1",
            },
          },
          data: expect.objectContaining({
            passedCount: 5,
          }),
        })
      );
    });
  });

  describe("getMatchHistory", () => {
    it("filters by mode and category", async () => {
      (prismaMock.matchParticipant.findMany as any).mockResolvedValue([]);

      await matchRepo.getMatchHistory("u1", 10, 0, "Strings", MatchMode.FFA);

      expect(prismaMock.matchParticipant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "u1",
            match: expect.objectContaining({
              mode: MatchMode.FFA,
              problem: {
                category: "Strings",
              },
            }),
          }),
        })
      );
    });

    it("supports pagination with limit and offset", async () => {
      (prismaMock.matchParticipant.findMany as any).mockResolvedValue([]);

      await matchRepo.getMatchHistory("u1", 5, 10);

      expect(prismaMock.matchParticipant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 10,
        })
      );
    });
  });

  describe("Problem Management", () => {
    it("creates a problem", async () => {
      (prismaMock.problem.create as any).mockResolvedValue({ id: "p1" });

      const problem = await matchRepo.createProblem({
        title: "Test",
        statement: "...",
        difficulty: Difficulty.MEDIUM,
        category: "Strings",
      });

      expect(problem.id).toBe("p1");
      expect(prismaMock.problem.create).toHaveBeenCalled();
    });

    it("adds a test case", async () => {
      (prismaMock.testCase.create as any).mockResolvedValue({ id: "tc1" });

      const tc = await matchRepo.addTestCase("p1", "in", "out");
      expect(tc.id).toBe("tc1");
      expect(prismaMock.testCase.create).toHaveBeenCalled();
    });
  });

  describe("Leaderboard", () => {
    it("supports sorting by createdAt", async () => {
      (prismaMock.user.findMany as any).mockResolvedValue([]);

      await matchRepo.getLeaderboard(10, "createdAt");

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: "desc" }],
        })
      );
    });
  });
});
