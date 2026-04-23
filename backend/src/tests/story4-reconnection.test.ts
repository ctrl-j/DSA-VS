import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset } from "jest-mock-extended";

const prismaMock = mockDeep<PrismaClient>();

jest.mock("../db/client", () => ({
  prisma: prismaMock,
}));

import { getMatchById } from "../db/match-repo";

describe("Story 4 - Reconnection (getMatchById)", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  it("returns match with problem, participants, and submissions", async () => {
    const mockMatch = {
      id: "match1",
      mode: "RANKED",
      status: "ACTIVE",
      startedAt: new Date(),
      problem: {
        id: "p1",
        title: "Two Sum",
        statement: "Given an array...",
      },
      participants: [
        { userId: "u1", startElo: 1200, user: { id: "u1", username: "alice", elo: 1200 } },
        { userId: "u2", startElo: 1300, user: { id: "u2", username: "bob", elo: 1300 } },
      ],
      submissions: [
        { id: "s1", userId: "u1", language: "python", code: "print(1)" },
      ],
    };

    (prismaMock.match.findUnique as any).mockResolvedValue(mockMatch);

    const result = await getMatchById("match1");
    expect(result).not.toBeNull();
    expect(result!.problem).toBeDefined();
    expect(result!.participants).toHaveLength(2);
    expect(result!.submissions).toHaveLength(1);
  });

  it("returns null for non-existent match", async () => {
    (prismaMock.match.findUnique as any).mockResolvedValue(null);

    const result = await getMatchById("nonexistent");
    expect(result).toBeNull();
  });
});
