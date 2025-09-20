import bcrypt from "bcryptjs";

const LEGACY_FORCE_RESET_SUFFIX = ".CHANGEME";
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  const effectiveHash = hashedPassword.endsWith(LEGACY_FORCE_RESET_SUFFIX)
    ? hashedPassword.slice(0, -LEGACY_FORCE_RESET_SUFFIX.length)
    : hashedPassword;
  return bcrypt.compare(password, effectiveHash);
}

// Backwards-compat helper: detect legacy suffix on stored hash
export function hasLegacyResetSuffix(hashedPassword: string | null | undefined): boolean {
  return typeof hashedPassword === 'string' && hashedPassword.endsWith(LEGACY_FORCE_RESET_SUFFIX);
}
