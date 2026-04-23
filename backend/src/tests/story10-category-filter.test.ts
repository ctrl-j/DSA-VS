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

describe("Story 10 – Category Filter", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  it("passes category filter to the Prisma where clause", async () => {
    (prismaMock.matchParticipant.findMany as any).mockResolvedValue([]);

    await getMatchHistory("user1", 20, 0, "Arrays");

    expect(prismaMock.matchParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user1",
          match: expect.objectContaining({
            problem: { category: "Arrays" },
          }),
        }),
      })
    );
  });

  it("omits category from query when not provided", async () => {
    (prismaMock.matchParticipant.findMany as any).mockResolvedValue([]);

    await getMatchHistory("user1", 20, 0);

    const call = (prismaMock.matchParticipant.findMany as any).mock.calls[0][0];
    expect(call.where.match).not.toHaveProperty("problem");
  });

  it("combines category and mode filters", async () => {
    (prismaMock.matchParticipant.findMany as any).mockResolvedValue([]);

    await getMatchHistory("user1", 10, 0, "Trees", "RANKED" as any);

    expect(prismaMock.matchParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          match: expect.objectContaining({
            mode: "RANKED",
            problem: { category: "Trees" },
          }),
        }),
      })
    );
  });
});
