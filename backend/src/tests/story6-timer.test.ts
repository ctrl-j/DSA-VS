import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { GlobalMatchQueue } from "../global-match-queue";
import { User } from "../user";

describe("Story 6 - Timer (Match Creation & Expanding Window)", () => {
  it("expanding window is 100 at 0 seconds wait time", () => {
    const queue = new GlobalMatchQueue();
    // Access private method via any cast for testing
    const window = (queue as any).expandingWindow(1000, 1000);
    expect(window).toBe(100);
  });

  it("expanding window is 125 at 10 seconds wait time", () => {
    const queue = new GlobalMatchQueue();
    const joinedAt = 0;
    const now = 10000; // 10 seconds later
    const window = (queue as any).expandingWindow(joinedAt, now);
    expect(window).toBe(125);
  });

  it("expanding window grows and caps at 400", () => {
    const queue = new GlobalMatchQueue();
    const joinedAt = 0;

    // At 40s: 100 + 4*25 = 200
    const at40s = (queue as any).expandingWindow(joinedAt, 40000);
    expect(at40s).toBe(200);

    // At 120s: 100 + 12*25 = 400 (cap)
    const at120s = (queue as any).expandingWindow(joinedAt, 120000);
    expect(at120s).toBe(400);

    // At 300s: still capped at 400
    const at300s = (queue as any).expandingWindow(joinedAt, 300000);
    expect(at300s).toBe(400);
  });

  it("match creation sets startedAt via createMatchForUsers", async () => {
    // This tests the match-repo layer which sets startedAt: now()
    // We verify the Prisma call includes startedAt
    const { PrismaClient } = await import("@prisma/client");
    const { mockDeep, mockReset } = await import("jest-mock-extended");

    const prismaMock = mockDeep<InstanceType<typeof PrismaClient>>();

    jest.mock("../db/client", () => ({
      prisma: prismaMock,
    }));

    (prismaMock.problem.findMany as any).mockResolvedValue([
      { id: "p1", title: "Test Problem", statement: "..." },
    ]);
    (prismaMock.match.create as any).mockResolvedValue({
      id: "m1",
      startedAt: new Date(),
      participants: [],
      problem: null,
    });

    const { createMatchForUsers } = await import("../db/match-repo");
    await createMatchForUsers(
      { id: "u1", elo: 1200 },
      { id: "u2", elo: 1300 },
      "RANKED" as any
    );

    expect(prismaMock.match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startedAt: expect.any(Date),
        }),
      })
    );
  });
});
