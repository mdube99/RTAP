import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";

import { env } from "@/env";
import { logger } from "@/server/logger";

import { LOGIN_LINK_PROVIDER_ID } from "./constants";

export { LOGIN_LINK_PROVIDER_ID } from "./constants";
const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

function getBaseUrl(provided?: string) {
  const base = provided ?? env.AUTH_URL ?? "http://localhost:3000";
  try {
    return new URL(base);
  } catch (error) {
    logger.warn(
      { event: "auth.login_link.invalid_base", base, error },
      "Invalid AUTH_URL provided, falling back to http://localhost:3000",
    );
    return new URL("http://localhost:3000");
  }
}

function hashToken(token: string, secret: string) {
  return crypto.createHash("sha256").update(`${token}${secret}`).digest("hex");
}

export async function createLoginLink(
  db: PrismaClient,
  params: {
    email: string;
    callbackPath?: string;
    expiresInSeconds?: number;
    baseUrl?: string;
  },
) {
  const email = params.email.trim().toLowerCase();
  if (!email) {
    throw new Error("Cannot generate login link without an email address");
  }

  const secret = env.AUTH_SECRET;
  const ttl = params.expiresInSeconds ?? DEFAULT_TTL_SECONDS;
  const expires = new Date(Date.now() + ttl * 1000);
  const token = crypto.randomBytes(32).toString("hex");
  const hashed = hashToken(token, secret);

  // Only allow a single active login link per email to reduce risk of reuse.
  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.verificationToken.create({
    data: {
      identifier: email,
      token: hashed,
      expires,
    },
  });

  const baseUrl = getBaseUrl(params.baseUrl);
  const callbackDestination = params.callbackPath ?? "/";
  const callbackTarget = new URL(callbackDestination, baseUrl);
  const link = new URL(`/api/auth/callback/${LOGIN_LINK_PROVIDER_ID}`, baseUrl);
  link.searchParams.set("callbackUrl", callbackTarget.toString());
  link.searchParams.set("token", token);
  link.searchParams.set("email", email);

  return { url: link.toString(), expires };
}
