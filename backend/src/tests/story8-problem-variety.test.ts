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

import { findProblemForMatch } from "../db/match-repo";

describe("Story 8 – Problem Variety", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  it("selects one problem from multiple available problems", async () => {
    const problems = [
      { id: "p1", title: "Two Sum", statement: "Given an array..." },
      { id: "p2", title: "Reverse Linked List", statement: "Reverse a singly..." },
      { id: "p3", title: "Binary Search", statement: "Given a sorted..." },
    ];
    (prismaMock.problem.findMany as any).mockResolvedValue(problems);

    const result = await findProblemForMatch();

    expect(result).not.toBeNull();
    expect(problems.map((p) => p.id)).toContain(result!.id);
  });

  it("returns null when no problems exist", async () => {
    (prismaMock.problem.findMany as any).mockResolvedValue([]);

    const result = await findProblemForMatch();

    expect(result).toBeNull();
  });

  it("passes preferred difficulty to the query", async () => {
    (prismaMock.problem.findMany as any).mockResolvedValue([
      { id: "p1", title: "Easy One", statement: "..." },
    ]);

    await findProblemForMatch("EASY" as any);

    expect(prismaMock.problem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ difficulty: "EASY" }),
      })
    );
  });
});
