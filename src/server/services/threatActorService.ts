import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export interface ThreatActorCreateInput {
  name: string;
  description: string;
  topThreat?: boolean;
  mitreTechniqueIds?: string[];
}

export async function createThreatActor(db: PrismaClient, input: ThreatActorCreateInput) {
  const { mitreTechniqueIds = [], topThreat = false, ...data } = input;
  return db.threatActor.create({
    data: {
      ...data,
      topThreat,
      mitreTechniques: { connect: mitreTechniqueIds.map((id) => ({ id })) },
    },
    include: {
      mitreTechniques: {
        include: { tactic: true },
      },
    },
  });
}

export interface ThreatActorUpdateInput {
  id: string;
  name?: string;
  description?: string;
  topThreat?: boolean;
  mitreTechniqueIds?: string[];
}

export async function updateThreatActor(db: PrismaClient, input: ThreatActorUpdateInput) {
  const { id, mitreTechniqueIds, ...updateData } = input;
  return db.threatActor.update({
    where: { id },
    data: {
      ...updateData,
      ...(mitreTechniqueIds !== undefined && {
        mitreTechniques: { set: mitreTechniqueIds.map((techniqueId) => ({ id: techniqueId })) },
      }),
    },
    include: {
      mitreTechniques: { include: { tactic: true } },
    },
  });
}

export async function deleteThreatActor(db: PrismaClient, id: string) {
  const operationsCount = await db.operation.count({ where: { threatActorId: id } });
  if (operationsCount > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot delete threat actor: ${operationsCount} operation(s) are using this threat actor`,
    });
  }
  return db.threatActor.delete({ where: { id } });
}
