import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

// Mock FS writes to avoid touching disk
vi.mock("fs", () => ({ mkdirSync: vi.fn(), writeFileSync: vi.fn(), default: {} }));

// Mock MITRE data provider with minimal valid data
vi.mock("@/lib/mitreStix", () => ({
  getMitreMetadata: () => ({ name: "Enterprise ATT&CK", version: "test" }),
  getMitreTactics: () => ([{ id: "TA0001", name: "Initial Access", description: "d" }]),
  getMitreTechniques: () => ([{ id: "T1000", name: "Technique", description: "d", tacticId: "TA0001" }]),
  getMitreSubTechniques: () => ([{ id: "T1000.001", name: "Sub", description: "d", techniqueId: "T1000" }]),
}));

describe("ensureInitialized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INITIAL_ADMIN_PASSWORD = "test-password";
  });

  it("creates admin when no users and seeds MITRE when empty", async () => {
    const user = { count: vi.fn().mockResolvedValue(0), upsert: vi.fn() };
    const mitreTactic = { count: vi.fn().mockResolvedValue(0), upsert: vi.fn() };
    const mitreTechnique = { upsert: vi.fn() };
    const mitreSubTechnique = { upsert: vi.fn() };
    const db = { user, mitreTactic, mitreTechnique, mitreSubTechnique } as unknown as PrismaClient;

    const { ensureInitialized } = await import("@/server/init/ensure-initialized");
    await ensureInitialized(db);

    expect(user.upsert).toHaveBeenCalled();
    const upsertArg = (user.upsert as unknown as jest.Mock).mock.calls[0]?.[0] as unknown as {
      update: Record<string, unknown>; create: Record<string, unknown>;
    } | undefined;
    if (upsertArg) {
      expect(upsertArg.update).toEqual(expect.objectContaining({ mustChangePassword: true }));
      expect(upsertArg.create).toEqual(expect.objectContaining({ mustChangePassword: true }));
    }
    expect(mitreTactic.upsert).toHaveBeenCalled();
    expect(mitreTechnique.upsert).toHaveBeenCalled();
    expect(mitreSubTechnique.upsert).toHaveBeenCalled();
  });
});
