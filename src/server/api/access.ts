import type { Prisma } from "@prisma/client";
import type { AuthedContext } from "@/server/api/trpc";

// Returns a Prisma filter for operations the current user can access
export function getAccessibleOperationFilter(
  ctx: AuthedContext,
): Prisma.OperationWhereInput {
  const { user } = ctx.session;

  if (user.role === "ADMIN") return {};

  // New model: operations are either visible to everyone, or to specific groups.
  // A non-admin user can access an operation when:
  // - visibility is EVERYONE, or
  // - visibility is GROUPS_ONLY and the user is a member of at least one group in accessGroups.
  return {
    OR: [
      { visibility: "EVERYONE" },
      {
        AND: [
          { visibility: "GROUPS_ONLY" },
          {
            accessGroups: {
              some: {
                group: {
                  members: { some: { userId: user.id } },
                },
              },
            },
          },
        ],
      },
    ],
  };
}

// Verifies if the user can view/modify a specific operation
export async function checkOperationAccess(
  ctx: AuthedContext,
  operationId: number,
  action: "view" | "modify" = "view",
): Promise<boolean> {
  const { user } = ctx.session;
  if (user.role === "ADMIN") return true;

  const operation = await ctx.db.operation.findUnique({
    where: { id: operationId },
    include: {
      accessGroups: {
        include: {
          group: { include: { members: { where: { userId: user.id } } } },
        },
      },
    },
  });

  if (!operation) return false;

  // Visibility checks for non-admins
  if (operation.visibility === "GROUPS_ONLY") {
    const isMember = operation.accessGroups.some((ag) => ag.group.members.length > 0);
    if (!isMember) return false;
  }

  if (action === "modify") {
    // Viewers cannot modify; Operators can modify if they have access via visibility rules
    if (user.role === "VIEWER") return false;
    if (user.role === "OPERATOR" && operation.createdById !== user.id) {
      return false;
    }
  }

  return true;
}
