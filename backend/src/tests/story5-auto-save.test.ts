import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset } from "jest-mock-extended";

const prismaMock = mockDeep<PrismaClient>();

jest.mock("../db/client", () => ({
  prisma: prismaMock,
}));

import { saveDraft, getDraft } from "../db/match-repo";

describe("Story 5 - Auto-Save (Draft Persistence)", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  it("saveDraft calls upsert with correct matchId, userId, and code", async () => {
    const mockDraft = { id: "d1", matchId: "m1", userId: "u1", code: "print(42)" };
    (prismaMock.draft.upsert as any).mockResolvedValue(mockDraft);

    const result = await saveDraft("m1", "u1", "print(42)");
    expect(result).toEqual(mockDraft);
    expect(prismaMock.draft.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { matchId_userId: { matchId: "m1", userId: "u1" } },
        create: expect.objectContaining({ matchId: "m1", userId: "u1", code: "print(42)" }),
        update: expect.objectContaining({ code: "print(42)" }),
      })
    );
  });

  it("getDraft calls findUnique with correct composite key", async () => {
    const mockDraft = { id: "d1", matchId: "m1", userId: "u1", code: "print(42)" };
    (prismaMock.draft.findUnique as any).mockResolvedValue(mockDraft);

    const result = await getDraft("m1", "u1");
    expect(result).toEqual(mockDraft);
    expect(prismaMock.draft.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { matchId_userId: { matchId: "m1", userId: "u1" } },
      })
    );
  });

  it("getDraft returns null when no draft exists", async () => {
    (prismaMock.draft.findUnique as any).mockResolvedValue(null);

    const result = await getDraft("m1", "u1");
    expect(result).toBeNull();
  });
});
