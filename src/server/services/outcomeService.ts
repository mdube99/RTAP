import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { OutcomeStatus, OutcomeType } from "@prisma/client";

export type CreateOutcomeDTO = {
  techniqueId: string;
  type: OutcomeType;
  status: OutcomeStatus;
  detectionTime?: string | null;
  notes?: string;
  screenshotUrl?: string;
  logData?: string;
  toolIds?: string[];
  logSourceIds?: string[];
};

export type UpdateOutcomeDTO = {
  id: string;
  type?: OutcomeType;
  status?: OutcomeStatus;
  detectionTime?: string | null;
  notes?: string;
  screenshotUrl?: string;
  logData?: string;
  toolIds?: string[];
  logSourceIds?: string[];
};

export async function createOutcome(db: PrismaClient, dto: CreateOutcomeDTO) {
  const { toolIds, logSourceIds, ...outcomeData } = dto;

  const technique = await db.technique.findUnique({
    where: { id: dto.techniqueId },
  });
  if (!technique)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Technique not found",
    });

  if (toolIds?.length) {
    const tools = await db.tool.findMany({ where: { id: { in: toolIds } } });
    if (tools.length !== toolIds.length)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more tools not found",
      });
  }

  if (logSourceIds?.length) {
    const logs = await db.logSource.findMany({
      where: { id: { in: logSourceIds } },
    });
    if (logs.length !== logSourceIds.length)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more log sources not found",
      });
  }

  if (
    (dto.status === "DETECTED" || dto.status === "ATTRIBUTED") &&
    !dto.detectionTime
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Timestamp is required for detected/attributed outcomes",
    });
  }

  return db.outcome.create({
    data: {
      ...outcomeData,
      detectionTime: outcomeData.detectionTime
        ? new Date(outcomeData.detectionTime)
        : undefined,
      tools: toolIds ? { connect: toolIds.map((id) => ({ id })) } : undefined,
      logSources: logSourceIds
        ? { connect: logSourceIds.map((id) => ({ id })) }
        : undefined,
    },
    include: defaultOutcomeInclude(),
  });
}

export async function updateOutcome(db: PrismaClient, dto: UpdateOutcomeDTO) {
  const { id, toolIds, logSourceIds, ...updateData } = dto;

  const existing = await db.outcome.findUnique({ where: { id } });
  if (!existing)
    throw new TRPCError({ code: "NOT_FOUND", message: "Outcome not found" });

  if (toolIds?.length) {
    const tools = await db.tool.findMany({ where: { id: { in: toolIds } } });
    if (tools.length !== toolIds.length)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more tools not found",
      });
  }
  if (logSourceIds?.length) {
    const logs = await db.logSource.findMany({
      where: { id: { in: logSourceIds } },
    });
    if (logs.length !== logSourceIds.length)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more log sources not found",
      });
  }

  if (
    dto.status &&
    (dto.status === "DETECTED" || dto.status === "ATTRIBUTED") &&
    !dto.detectionTime &&
    !existing.detectionTime
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Timestamp is required for detected/attributed outcomes",
    });
  }

  const payload: Prisma.OutcomeUpdateInput & {
    tools?: { set: { id: string }[] };
    logSources?: { set: { id: string }[] };
  } = {
    ...updateData,
    detectionTime:
      updateData.detectionTime !== undefined
        ? updateData.detectionTime
          ? new Date(updateData.detectionTime)
          : null
        : undefined,
  };

  if (toolIds !== undefined)
    payload.tools = { set: toolIds.map((id) => ({ id })) };
  if (logSourceIds !== undefined)
    payload.logSources = { set: logSourceIds.map((id) => ({ id })) };

  return db.outcome.update({
    where: { id },
    data: payload,
    include: defaultOutcomeInclude(),
  });
}

export async function deleteOutcome(db: PrismaClient, id: string) {
  // Auth/permission checks belong in router
  return db.outcome.delete({ where: { id } });
}

export async function bulkCreateOutcomes(
  db: PrismaClient,
  items: CreateOutcomeDTO[],
) {
  // Basic technique existence check
  const techniqueIds = items.map((o) => o.techniqueId);
  const techniques = await db.technique.findMany({
    where: { id: { in: techniqueIds } },
    include: { operation: true },
  });
  if (techniques.length !== techniqueIds.length)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more techniques not found",
    });

  const tx = items.map(({ toolIds, logSourceIds, ...data }) =>
    db.outcome.create({
      data: {
        ...data,
        detectionTime: data.detectionTime
          ? new Date(data.detectionTime)
          : undefined,
        tools: toolIds ? { connect: toolIds.map((id) => ({ id })) } : undefined,
        logSources: logSourceIds
          ? { connect: logSourceIds.map((id) => ({ id })) }
          : undefined,
      },
      include: defaultOutcomeInclude(),
    }),
  );
  return db.$transaction(tx);
}

export function defaultOutcomeInclude() {
  return {
    technique: {
      include: {
        operation: { select: { id: true, name: true } },
        mitreTechnique: { include: { tactic: true } },
        mitreSubTechnique: true,
      },
    },
    tools: true,
    logSources: true,
  } satisfies Prisma.OutcomeInclude;
}
