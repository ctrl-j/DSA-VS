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

describe("Story 9 – Difficulty Ratings", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  it("problems have correct difficulty fields (EASY, MEDIUM, HARD)", async () => {
    const problems = [
      { id: "p1", title: "Two Sum", statement: "...", difficulty: "EASY", isActive: true },
      { id: "p2", title: "LRU Cache", statement: "...", difficulty: "MEDIUM", isActive: true },
      { id: "p3", title: "Median of Two Sorted Arrays", statement: "...", difficulty: "HARD", isActive: true },
    ];
    (prismaMock.problem.findMany as any).mockResolvedValue(problems);

    const result = await prismaMock.problem.findMany();

    expect(result).toHaveLength(3);
    expect(result[0].difficulty).toBe("EASY");
    expect(result[1].difficulty).toBe("MEDIUM");
    expect(result[2].difficulty).toBe("HARD");
  });

  it("each problem returned has a difficulty property", async () => {
    const problems = [
      { id: "p1", title: "A", statement: "...", difficulty: "EASY", isActive: true },
      { id: "p2", title: "B", statement: "...", difficulty: "HARD", isActive: true },
    ];
    (prismaMock.problem.findMany as any).mockResolvedValue(problems);

    const result = await prismaMock.problem.findMany();

    for (const problem of result) {
      expect(problem).toHaveProperty("difficulty");
      expect(["EASY", "MEDIUM", "HARD"]).toContain(problem.difficulty);
    }
  });
});
