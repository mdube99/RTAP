import { type DefaultSession, type NextAuthConfig } from "next-auth";
import type { JWT as NextAuthJWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import Passkey from "next-auth/providers/passkey";
import type { EmailConfig } from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { type UserRole } from "@prisma/client";

import { db } from "@/server/db";
import { auditEvent, logger } from "@/server/logger";
import { env } from "@/env";
import { headers } from "next/headers";
import { LOGIN_LINK_PROVIDER_ID } from "./login-link";

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
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: UserRole;
  }
}

// Local extension for JWT to carry role information
type AugmentedJWT = NextAuthJWT & { role?: UserRole };

const loginLinkProvider: EmailConfig = {
  id: LOGIN_LINK_PROVIDER_ID,
  type: "email",
  name: "One-time Link",
  maxAge: 60 * 60, // 1 hour
  async sendVerificationRequest() {
    // Login links are generated via scripts/admin tooling only.
    throw new Error("Login link generation is restricted to administrators.");
  },
  options: {},
};

const passkeysEnabled = env.AUTH_PASSKEYS_ENABLED === "true";

async function resolveUserIdentity(user: {
  id?: string | null;
  email?: string | null;
  role?: UserRole;
} | null | undefined) {
  if (!user) return null;
  if (user.role && user.id) {
    return { id: user.id, role: user.role };
  }

  if (user.id) {
    try {
      const existingById = await db.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true },
      });
      if (existingById) return existingById;
    } catch (error) {
      logger.warn({ event: "auth.resolve_user_failed", id: user.id, error }, "Failed resolving user by id");
    }
  }

  const email = user.email?.toLowerCase();
  if (email) {
    try {
      const existingByEmail = await db.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });
      if (existingByEmail) return existingByEmail;
    } catch (error) {
      logger.warn({ event: "auth.resolve_user_failed", email, error }, "Failed resolving user by email");
    }
  }

  return null;
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  adapter: PrismaAdapter(db),
  useSecureCookies: env.AUTH_URL?.startsWith("https://") ?? false,
  experimental: passkeysEnabled ? { enableWebAuthn: true } : undefined,
  // Route Auth.js logs through our Pino logger for concise, structured output
  logger: {
    error(error) {
      const payload: Record<string, unknown> = { event: "authjs.error", name: (error as { name?: string }).name };
      if (error?.message) payload.message = error.message;
      if (process.env.NODE_ENV === "development" && (error as { stack?: string }).stack) {
        payload.stack = (error as { stack?: string }).stack;
      }
      logger.error(payload, "Auth.js error");
    },
    warn(code) {
      logger.warn({ event: "authjs.warn", code }, "Auth.js warn");
    },
    debug(message, metadata) {
      if (process.env.NODE_ENV === "development") {
        const payload: Record<string, unknown> = { event: "authjs.debug", message };
        if (metadata && typeof metadata === "object") Object.assign(payload, metadata as Record<string, unknown>);
        logger.debug(payload, "Auth.js debug");
      }
    },
  },
  providers: [
    loginLinkProvider,
    ...(passkeysEnabled ? [Passkey({})] : []),
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
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  // Use Auth.js defaults for cookies to avoid environment mismatches
  callbacks: {
    // Enforce provider toggles and OAuth user existence rules
    signIn: async ({ account, user }) => {
      if (!account) return true;

      const provider = account.provider;

      if (provider === LOGIN_LINK_PROVIDER_ID) {
        const emailAddr = (user as { email?: string | null } | undefined)?.email?.toLowerCase();
        if (!emailAddr) return false;
        try {
          const existing = await db.user.findUnique({ where: { email: emailAddr } });
          return Boolean(existing);
        } catch (error) {
          logger.warn({ event: "auth.login_link_validation_failed", email: emailAddr, error }, "Blocked login-link sign-in due to validation error");
          return false;
        }
      }

      if (provider === "passkey") {
        if (!passkeysEnabled) {
          logger.warn({ event: "auth.passkey_disabled" }, "Blocked passkey sign-in because provider is disabled");
          return false;
        }
        const resolved = await resolveUserIdentity(user as { id?: string | null; email?: string | null });
        return Boolean(resolved);
      }

      if (provider === "google") {
        const emailAddr = (user as { email?: string | null } | undefined)?.email?.toLowerCase();
        if (!emailAddr) return false;
        try {
          const existing = await db.user.findUnique({ where: { email: emailAddr } });
          return Boolean(existing);
        } catch (error) {
          logger.warn(
            { event: "auth.oauth_validation_error", provider, error },
            "Blocked OAuth sign-in due to validation error",
          );
          return false;
        }
      }

      // Unknown providers blocked by default
      return false;
    },
    session: async ({ session, token }) => {
      const t = token as AugmentedJWT;
      session.user = {
        ...session.user,
        id: token.sub ?? (session.user?.id as string | undefined),
        role: t.role ?? (session.user as { role?: UserRole }).role!,
      } as typeof session.user;
      return session;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        const resolved = await resolveUserIdentity(user as { id?: string | null; email?: string | null; role?: UserRole });
        if (resolved) {
          const t = token as AugmentedJWT;
          t.sub = resolved.id;
          t.role = resolved.role;
          return t;
        }
      }
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

      if (user?.id) {
        try {
          await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
        } catch (error) {
          logger.warn({ event: "auth.last_login_update_failed", userId: user.id, error }, "Failed to update last login timestamp");
        }
      }

      logger.info(
        auditEvent(
          { headers: headerBag },
          "auth.sign_in",
          { provider: account?.provider, isNewUser },
          { actor: user as { id?: string | null; email?: string | null } | null | undefined },
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
