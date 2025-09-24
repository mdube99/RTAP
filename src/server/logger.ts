import pino, { type LoggerOptions, type DestinationStream } from "pino";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

const nodeEnv = process.env.NODE_ENV ?? "development";
const isDev = nodeEnv === "development";

// Allow overriding level via LOG_LEVEL; default to debug in dev, info in prod
const level: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? (isDev ? "debug" : "info");

const options: LoggerOptions = {
  level,
  base: {
    service: "rtap",
    env: nodeEnv,
  },
};
// Avoid pino transport (thread-stream) under Next dev; use pretty stream instead.
// Skip any Node-only modules when running in the Edge runtime (e.g., middleware).
let destination: DestinationStream | undefined = undefined;
if (isDev && process.env.NEXT_RUNTIME !== "edge") {
  try {
    type PrettyFactory = (options: {
      colorize: boolean;
      translateTime: string;
      singleLine: boolean;
    }) => DestinationStream;

    const prettyModule = (await import("pino-pretty")) as
      | { default?: PrettyFactory }
      | PrettyFactory;
    const pretty: PrettyFactory | undefined = typeof prettyModule === "function"
      ? prettyModule
      : prettyModule.default;

    if (pretty) {
      destination = pretty({
        colorize: true,
        translateTime: "SYS:standard",
        singleLine: false,
      });
    }
  } catch {
    // pino-pretty not installed; fall back to default stdout
    destination = undefined;
  }
}

export const logger = pino(options, destination);

// Small helper to extract best-effort client IP from standard proxy headers
function normalizeIp(ip: string | undefined): string | undefined {
  if (!ip) return ip;
  if (ip.startsWith("::ffff:")) return ip.slice("::ffff:".length);
  if (ip === "::1") return "127.0.0.1";
  return ip;
}

export function getClientIpFromHeaders(h: Headers): string | undefined {
  const forwardedRaw = h.get("x-forwarded-for") ?? "";
  const forwardedFirst = forwardedRaw.split(",")[0]?.trim();
  const realIp = h.get("x-real-ip") ?? undefined;
  const cfConnectingIp = h.get("cf-connecting-ip") ?? undefined;
  const chosen = (forwardedFirst && forwardedFirst.length > 0 ? forwardedFirst : undefined) ?? realIp ?? cfConnectingIp ?? undefined;
  return normalizeIp(chosen);
}

type AuditActor = { id?: string | null; email?: string | null } | null | undefined;

type AuditContext = {
  headers?: Headers;
  requestId?: string | null;
  session?: { user?: AuditActor } | null;
};

export function auditEvent(
  ctx: AuditContext,
  event: string,
  data?: Record<string, unknown>,
  options?: { actor?: AuditActor },
) {
  const payload: Record<string, unknown> = { event };
  const requestId = ctx.requestId ?? undefined;
  if (requestId) {
    payload.requestId = requestId;
  }

  const headers = ctx.headers;
  if (headers) {
    const ip = getClientIpFromHeaders(headers);
    if (ip) {
      payload.ip = ip;
    }
  }

  const actor = options?.actor ?? ctx.session?.user;
  if (actor?.id) {
    payload.actorId = actor.id;
  }
  if (actor?.email) {
    payload.actorEmail = actor.email;
  }

  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        payload[key] = value;
      }
    }
  }

  return payload;
}
