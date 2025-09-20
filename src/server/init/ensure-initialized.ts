import type { PrismaClient } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { readFileSync } from "fs";
import { logger } from "@/server/logger";
import { hashPassword } from "@/server/auth/password";
import {
  getMitreMetadata,
  getMitreTactics,
  getMitreTechniques,
  getMitreSubTechniques,
} from "@/lib/mitreStix";

let initPromise: Promise<void> | null = null;

export function ensureInitialized(db: PrismaClient): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 1) Ensure admin exists (if no users at all)
    const userCount = await db.user.count();
    if (userCount === 0) {
      const defaultEmail = process.env.INITIAL_ADMIN_EMAIL ?? "admin@example.com";
      // Require operator-supplied password in all environments (dev and prod)
      const providedPassword = (() => {
        const direct = process.env.INITIAL_ADMIN_PASSWORD;
        const filePath = process.env.INITIAL_ADMIN_PASSWORD_FILE;
        if (direct && direct.trim().length > 0) return direct;
        if (filePath && filePath.trim().length > 0) {
          try {
            return readFileSync(filePath, "utf-8").trim();
          } catch {
            // ignore; handled below
          }
        }
        return undefined;
      })();

      if (!providedPassword) {
        throw new Error(
          "Missing INITIAL_ADMIN_PASSWORD (or *_FILE) for first-run initialization.",
        );
      }

      // Choose password depending on environment
      const passwordPlain = providedPassword;
      const passwordHash = await hashPassword(passwordPlain);

      // Upsert admin by email to be race safe
      await db.user.upsert({
        where: { email: defaultEmail },
        update: { role: UserRole.ADMIN, password: passwordHash, mustChangePassword: true },
        create: {
          email: defaultEmail,
          name: "Admin User",
          password: passwordHash,
          mustChangePassword: true,
          role: UserRole.ADMIN,
        },
      });

      // No auto-generation or file write in any environment; operator must supply initial password
    }

    // 2) Ensure MITRE data exists
    const tacticCount = await db.mitreTactic.count();
    if (tacticCount === 0) {
      const meta = getMitreMetadata();
      logger.info(`[init] Seeding MITRE ATT&CK ${meta.name} v${meta.version}`);

      const tactics = getMitreTactics();
      const techniques = getMitreTechniques();
      const subTechniques = getMitreSubTechniques();

      // Upsert tactics
      for (const t of tactics) {
        await db.mitreTactic.upsert({ where: { id: t.id }, update: {}, create: t });
      }

      // Upsert techniques (validate tactic exists from above)
      const validTacticIds = new Set(tactics.map((t) => t.id));
      const insertedTechniqueIds = new Set<string>();
      for (const tech of techniques) {
        if (!validTacticIds.has(tech.tacticId)) continue;
        await db.mitreTechnique.upsert({ where: { id: tech.id }, update: {}, create: tech });
        insertedTechniqueIds.add(tech.id);
      }

      // Upsert sub-techniques
      for (const st of subTechniques) {
        if (!insertedTechniqueIds.has(st.techniqueId)) continue;
        await db.mitreSubTechnique.upsert({ where: { id: st.id }, update: {}, create: st });
      }

      logger.info(
        `[init] Seeded ${tactics.length} tactics, ${insertedTechniqueIds.size} techniques, ` +
        `${subTechniques.filter(st => insertedTechniqueIds.has(st.techniqueId)).length} sub-techniques`
      );
    }
  })();

  return initPromise;
}
