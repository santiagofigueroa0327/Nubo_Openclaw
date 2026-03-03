import { randomUUID } from "node:crypto";
import type { LogEntry, LogLevel } from "./types";

export function createRequestId(): string {
  return randomUUID().slice(0, 8);
}

export function log(
  level: LogLevel,
  message: string,
  extra?: Partial<LogEntry>
): void {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    requestId: extra?.requestId ?? "system",
    level,
    message,
    ...extra,
  };
  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (msg: string, extra?: Partial<LogEntry>) => log("debug", msg, extra),
  info: (msg: string, extra?: Partial<LogEntry>) => log("info", msg, extra),
  warn: (msg: string, extra?: Partial<LogEntry>) => log("warn", msg, extra),
  error: (msg: string, extra?: Partial<LogEntry>) => log("error", msg, extra),
};
