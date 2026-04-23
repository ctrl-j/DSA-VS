import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset } from "jest-mock-extended";

const prismaMock = mockDeep<PrismaClient>();

jest.mock("@prisma/client", () => {
  const actual = jest.requireActual("@prisma/client") as Record<string, unknown>;
  return {
    ...actual,
    PrismaClient: jest.fn().mockImplementation(() => prismaMock),
  };
});

import { getMatchHistory } from "../db/match-repo";

describe("Story 11 – Match History", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  it("returns match history data for a user", async () => {
    const sampleData = [
      {
        matchId: "m1",
        userId: "user1",
        startElo: 1200,
        endElo: 1220,
        passedCount: 5,
        match: {
          id: "m1",
          mode: "RANKED",
          status: "COMPLETED",
          problem: { id: "p1", title: "Two Sum", difficulty: "EASY", category: "Arrays" },
          participants: [
            { userId: "user1", user: { id: "user1", username: "alice" } },
            { userId: "user2", user: { id: "user2", username: "bob" } },
          ],
        },
      },
    ];
    (prismaMock.matchParticipant.findMany as any).mockResolvedValue(sampleData);

    const result = await getMatchHistory("user1");

    expect(result).toHaveLength(1);
    expect(result[0].matchId).toBe("m1");
    expect(result[0].match.problem!.title).toBe("Two Sum");
  });

  it("passes pagination params (take/skip) correctly", async () => {
    (prismaMock.matchParticipant.findMany as any).mockResolvedValue([]);

    await getMatchHistory("user1", 10, 5);

    expect(prismaMock.matchParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 5,
      })
    );
  });

  it("uses default limit and offset when not specified", async () => {
    (prismaMock.matchParticipant.findMany as any).mockResolvedValue([]);

    await getMatchHistory("user1");

    expect(prismaMock.matchParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        skip: 0,
      })
    );
  });
});
