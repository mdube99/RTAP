// Lightweight client-side logger used by React components and browser-only code.
// Server code should import `@/server/logger` for structured logging.

type LogArgs = unknown[];

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

const isDev = () => typeof window !== "undefined" && process.env.NODE_ENV === "development";

interface BaseLogger {
  debug: (...args: LogArgs) => void;
  info: (...args: LogArgs) => void;
  warn: (...args: LogArgs) => void;
  error: (...args: LogArgs) => void;
}

export const logger: BaseLogger = {
  debug: (...args: LogArgs) => {
    // In the browser: default to verbose in dev; quiet otherwise
    if (isDev()) console.debug(...args);
  },
  info: (...args: LogArgs) => {
    if (isDev()) console.info(...args);
  },
  warn: (...args: LogArgs) => {
    console.warn(...args);
  },
  error: (...args: LogArgs) => {
    console.error(...args);
  },
};
