import type { OperationStatus } from "@prisma/client";

export const operationStatusLabels: Record<OperationStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const operationStatusBadgeVariant: Record<OperationStatus, "warning" | "info" | "success" | "error"> = {
  PLANNING: "warning",
  ACTIVE: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};
