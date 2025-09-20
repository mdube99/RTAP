import { type DefaultSession, type NextAuthConfig } from "next-auth";
import type { JWT as NextAuthJWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { type UserRole } from "@prisma/client";
import { authenticator } from "otplib";

import { db } from "@/server/db";
import { verifyPassword, hasLegacyResetSuffix } from "./password";
import { authRateLimit } from "@/lib/rateLimit";
import { auditEvent, getClientIpFromHeaders, logger } from "@/server/logger";
import { env } from "@/env";
import { headers } from "next/headers";
// Env-only SSO: no DB-backed provider configuration

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}

// Local extension for JWT to carry role + mustChangePassword
type AugmentedJWT = NextAuthJWT & { role?: UserRole; mustChangePassword?: boolean };


// Credentials schema for validation
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  code: z.string().optional(),
});

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  useSecureCookies: env.AUTH_URL?.startsWith("https://") ?? false,
  // Route Auth.js logs through our Pino logger for concise, structured output
  logger: {
    error(error) {
      const payload: Record<string, unknown> = { event: 'authjs.error', name: (error as { name?: string }).name };
      if (error?.message) payload.message = error.message;
      if (process.env.NODE_ENV === 'development' && (error as { stack?: string }).stack) {
        payload.stack = (error as { stack?: string }).stack;
      }
      logger.error(payload, 'Auth.js error');
    },
    warn(code) {
      logger.warn({ event: 'authjs.warn', code }, 'Auth.js warn');
    },
    debug(message, metadata) {
      if (process.env.NODE_ENV === 'development') {
        const payload: Record<string, unknown> = { event: 'authjs.debug', message };
        if (metadata && typeof metadata === 'object') Object.assign(payload, metadata as Record<string, unknown>);
        logger.debug(payload, 'Auth.js debug');
      }
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        let attemptedEmail: string | undefined = undefined;
        // Resolve client IP for security event logging
        let ip: string | undefined = undefined;
        try {
          try {
            const requestHeaders = await headers();
            ip = getClientIpFromHeaders(requestHeaders);
          } catch {}

          // Respect credentials provider toggle (default enabled when missing)
          const credsEnabled = env.AUTH_CREDENTIALS_ENABLED !== "false";
          if (!credsEnabled) {
            logger.warn({ event: "auth.credentials_disabled", ip }, "Credentials provider disabled");
            return null;
          }

          // Skip rate limiting in development to avoid first-login issues
          if (process.env.NODE_ENV !== "development") {
            const rateLimitResult = await authRateLimit();
            if (!rateLimitResult.success) {
              logger.warn({ event: "auth.rate_limited", ip, limit: rateLimitResult.limit }, "Too many login attempts");
              throw new Error("Too many login attempts. Please try again later.");
            }
          }

          const parsed = credentialsSchema.safeParse(credentials);

          if (!parsed.success) {
            logger.warn({ event: "auth.invalid_login_payload", ip }, "Invalid login attempt");
            return null;
          }

          const { email, password, code } = parsed.data;
          attemptedEmail = email;

          // Find user by email with a 5s timeout to avoid hanging
          let timeout: NodeJS.Timeout | undefined;
          const lookup = await Promise.race([
            db.user.findUnique({ where: { email } }),
            new Promise<"timeout">((resolve) => {
              timeout = setTimeout(() => resolve("timeout"), 5000);
            }),
          ]);
          if (timeout) clearTimeout(timeout);

          if (lookup === "timeout") {
            throw new Error("Login lookup timed out");
          }

          const user = lookup;

          if (!user?.password) {
            logger.warn({ event: "auth.invalid_login_user_not_found", email, ip }, "Invalid login attempt");
            return null;
          }

          // Verify password
          const isValidPassword = await verifyPassword(password, user.password);
          const legacyReset = hasLegacyResetSuffix(user.password);

          if (!isValidPassword) {
            logger.warn({ event: "auth.invalid_password", email, ip }, "Invalid login attempt");
            return null;
          }

          // If user has TOTP enabled, require valid code
          if ((user as { twoFactorEnabled?: boolean }).twoFactorEnabled) {
            const secret = (user as { totpSecret?: string }).totpSecret;
            if (!secret || !code || !authenticator.check(code, secret)) {
              logger.warn("Invalid login attempt");
              return null;
            }
          }

          // If legacy suffix was detected, persist migration: clear suffix and set flag
          if (legacyReset) {
            try {
              await db.user.update({
                where: { id: user.id },
                data: {
                  password: user.password.slice(0, -".CHANGEME".length),
                  mustChangePassword: true,
                  lastLogin: new Date(),
                },
              });
            } catch {
              // ignore migration failure; session will still carry mustChangePassword
            }
          } else {
            // Update last login timestamp on successful auth
            await db.user.update({
              where: { id: user.id },
              data: { lastLogin: new Date() },
            });
          }

          // Return user object (password excluded)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            mustChangePassword: legacyReset || (user as { mustChangePassword?: boolean }).mustChangePassword === true,
          };
        } catch (error) {
          const hasMessage = (e: unknown): e is { message: string } =>
            typeof e === "object" && e !== null && "message" in e && typeof (e as { message?: unknown }).message === "string";
          const logMessage = hasMessage(error) ? error.message : String(error);
          logger.error({ event: "auth.login_failed", email: attemptedEmail, ip }, `Login failed: ${logMessage}`);
          return null;
        }
      },
    }),
    // Conditionally register Google provider when env credentials are available.
    // Actual enablement is enforced via DB in the signIn callback/UI.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt", // Required for credentials provider
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  // Use Auth.js defaults for cookies to avoid environment mismatches
  callbacks: {
    // Enforce provider toggles and OAuth user existence rules
    signIn: async ({ account, user }) => {
      // Default allow when no provider context (tests or system calls)
      if (!account) return true;

      const provider = account.provider;

      // Credentials: enforce env toggle
      if (provider === "credentials") {
        return env.AUTH_CREDENTIALS_ENABLED !== "false";
      }

      // Google: require pre-provisioned user by email (no auto-create)
        if (provider === "google") {
          const emailAddr = (user as { email?: string | null } | undefined)?.email ?? undefined;
          if (!emailAddr) return false;
          try {
            const existing = await db.user.findUnique({ where: { email: emailAddr } });
            return Boolean(existing);
          } catch {
          logger.warn({ event: "auth.oauth_validation_error" }, "Blocked OAuth sign-in due to validation error");
            return false;
          }
        }

      // Unknown providers blocked by default
      return false;
    },
    session: async ({ session, token }) => {
      const t = token as AugmentedJWT;
      // Derive session fields from token without DB calls (works in middleware/edge)
      session.user = {
        ...session.user,
        id: token.sub ?? (session.user?.id as string | undefined),
        role: t.role ?? (session.user as { role?: UserRole }).role!,
        mustChangePassword: t.mustChangePassword === true,
      } as typeof session.user;
      return session;
    },
    jwt: async ({ token, user, account }) => {
      // On sign-in, persist id and role in the token
      if (user) {
        const t = token as AugmentedJWT;
        // Credentials sign-in already provided role/id in user
        if (!account || account.provider === "credentials") {
          const u = user as { id: string; role: UserRole; mustChangePassword?: boolean };
          if (u?.id && u?.role) {
            t.sub = u.id;
            t.role = u.role;
            t.mustChangePassword = u.mustChangePassword === true;
            return t;
          }
        }

        // OAuth sign-in: look up user by email to populate token
        if (account?.provider === "google") {
          const emailAddr = (user as { email?: string }).email;
          if (!emailAddr) return token as AugmentedJWT;
          try {
            const existing = await db.user.findUnique({ where: { email: emailAddr } });
            if (existing) {
              const t = token as AugmentedJWT;
              t.sub = existing.id;
              t.role = existing.role;
              t.mustChangePassword = false;
              return t;
            }
          } catch {
            // Ignore lookup errors; fall through to default
          }
        }
        return token as AugmentedJWT;
      }

      // For existing sessions, ensure the user still exists.
      // If not, return null to clear the JWT and force a clean login.
      // Optionally, could validate existence; skip DB calls to stay edge-friendly
      return token as AugmentedJWT;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      let headerBag: Headers | undefined;
      try {
        headerBag = await headers();
      } catch {
        headerBag = undefined;
      }

      const actor = user as { id?: string | null; email?: string | null } | null | undefined;

      logger.info(
        auditEvent(
          { headers: headerBag },
          "auth.sign_in",
          { provider: account?.provider, isNewUser },
          { actor },
        ),
        "User signed in",
      );
    },
    async signOut(message) {
      let headerBag: Headers | undefined;
      try {
        headerBag = await headers();
      } catch {
        headerBag = undefined;
      }

      if ("session" in message) {
        const sessionData = message.session as { user?: { id?: string | null; email?: string | null } } | undefined;
        const sessionUser = sessionData?.user;
        logger.info(
          auditEvent({ headers: headerBag }, "auth.sign_out", undefined, { actor: sessionUser }),
          "User signed out",
        );
        return;
      }

      const token = message.token;
      const tokenActor: { id?: string | null; email?: string | null } = {
        id: token?.sub,
        email: (token as { email?: string | null } | undefined)?.email ?? undefined,
      };
      logger.info(
        auditEvent({ headers: headerBag }, "auth.sign_out", undefined, { actor: tokenActor }),
        "User signed out",
      );
    },
  },
  pages: {
    // Use our custom, sleek page that matches STYLE.md
    signIn: "/auth/signin",
  },
} satisfies NextAuthConfig;
