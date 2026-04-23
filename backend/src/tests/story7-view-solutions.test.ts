import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset } from "jest-mock-extended";

const prismaMock = mockDeep<PrismaClient>();

jest.mock("../db/client", () => ({
  prisma: prismaMock,
}));

describe("Story 7 - View Solutions", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  it("problem.findUnique returns solution text when present", async () => {
    const mockProblem = {
      id: "p1",
      title: "Two Sum",
      statement: "Given an array...",
      solution: "Use a hash map to store complements...",
    };

    (prismaMock.problem.findUnique as any).mockResolvedValue(mockProblem);

    const result = await prismaMock.problem.findUnique({
      where: { id: "p1" },
    });

    expect(result).not.toBeNull();
    expect(result!.solution).toBe("Use a hash map to store complements...");
  });

  it("problem.findUnique returns null solution when not set", async () => {
    const mockProblem = {
      id: "p2",
      title: "Reverse String",
      statement: "Write a function...",
      solution: null,
    };

    (prismaMock.problem.findUnique as any).mockResolvedValue(mockProblem);

    const result = await prismaMock.problem.findUnique({
      where: { id: "p2" },
    });

    expect(result).not.toBeNull();
    expect(result!.solution).toBeNull();
  });

  it("returns null for non-existent problem", async () => {
    (prismaMock.problem.findUnique as any).mockResolvedValue(null);

    const result = await prismaMock.problem.findUnique({
      where: { id: "nonexistent" },
    });

    expect(result).toBeNull();
  });
});
