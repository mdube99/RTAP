import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  createOutcome,
  updateOutcome,
} from "@/server/services/outcomeService";
import type { PrismaClient } from "@prisma/client";

const techniqueFindUnique = vi.fn();
const toolFindMany = vi.fn();
const logSourceFindMany = vi.fn();
const outcomeCreate = vi.fn();
const outcomeFindUnique = vi.fn();
const outcomeUpdate = vi.fn();

const mockDb = {
  technique: { findUnique: techniqueFindUnique },
  tool: { findMany: toolFindMany },
  logSource: { findMany: logSourceFindMany },
  outcome: { create: outcomeCreate, findUnique: outcomeFindUnique, update: outcomeUpdate },
} as unknown as PrismaClient;

describe("createOutcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when technique missing", async () => {
    techniqueFindUnique.mockResolvedValue(null);
    await expect(
      createOutcome(mockDb, {
        techniqueId: "tech-1",
        type: "DETECTION" as any,
        status: "NONE" as any,
      })
    ).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Technique not found" })
    );
  });

  it("throws when detected without timestamp", async () => {
    techniqueFindUnique.mockResolvedValue({ id: "tech-1" });
    await expect(
      createOutcome(mockDb, {
        techniqueId: "tech-1",
        type: "DETECTION" as any,
        status: "DETECTED" as any,
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "Timestamp is required for detected/attributed outcomes",
      })
    );
  });

  it("creates outcome with tool and log source", async () => {
    techniqueFindUnique.mockResolvedValue({ id: "tech-1" });
    toolFindMany.mockResolvedValue([{ id: "tool-1" }]);
    logSourceFindMany.mockResolvedValue([{ id: "log-1" }]);
    const result = { id: "out-1" } as any;
    outcomeCreate.mockResolvedValue(result);

    const res = await createOutcome(mockDb, {
      techniqueId: "tech-1",
      type: "DETECTION" as any,
      status: "NONE" as any,
      toolIds: ["tool-1"],
      logSourceIds: ["log-1"],
    });

    expect(outcomeCreate).toHaveBeenCalled();
    expect(res).toBe(result);
  });
});

describe("updateOutcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when outcome missing", async () => {
    outcomeFindUnique.mockResolvedValue(null);
    await expect(
      updateOutcome(mockDb, { id: "out-1", status: "NONE" as any })
    ).rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "Outcome not found" }));
  });

  it("throws when detected without timestamp", async () => {
    outcomeFindUnique.mockResolvedValue({ id: "out-1", detectionTime: null });
    await expect(
      updateOutcome(mockDb, {
        id: "out-1",
        status: "DETECTED" as any,
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "Timestamp is required for detected/attributed outcomes",
      })
    );
  });
});
