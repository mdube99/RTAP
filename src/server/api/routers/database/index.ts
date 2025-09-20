import { createTRPCRouter } from "@/server/api/trpc";
import { databaseBackupRouter } from "./backup";
import { databaseRestoreRouter } from "./restore";

export const databaseRouter = createTRPCRouter({
  ...databaseBackupRouter._def.procedures,
  ...databaseRestoreRouter._def.procedures,
});

