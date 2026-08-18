type LogLevel = "debug" | "info" | "warn" | "error";
type LogValue = string | number | boolean | null | undefined;
export type LogContext = Record<string, LogValue>;

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};
const sensitiveKey = /password|secret|token|authorization|cookie|allerg|medical|message|content/i;

function configuredLevel(): LogLevel {
  const input = process.env.LOG_LEVEL as LogLevel | undefined;
  return input && input in levels ? input : process.env.NODE_ENV === "production" ? "info" : "debug";
}

function clean(context: LogContext) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : value,
    ]),
  );
}

function write(level: LogLevel, event: string, context: LogContext = {}) {
  if (levels[level] < levels[configuredLevel()]) return;
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: process.env.SERVICE_NAME ?? "smart-kids-web",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    event,
    ...clean(context),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  debug: (event: string, context?: LogContext) => write("debug", event, context),
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};
