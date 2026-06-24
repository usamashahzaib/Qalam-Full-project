import "server-only"
import { createHash } from "crypto"

type LogLevel = "info" | "warn" | "error"

function hashPii(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12)
}

function sanitizeCtx(ctx: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(ctx)) {
    if ((k === "email" || k === "userEmail") && typeof v === "string") {
      out[k] = hashPii(v) + "@[redacted]"
    } else if ((k === "userId" || k === "user_id") && typeof v === "string") {
      out[k] = hashPii(v)
    } else {
      out[k] = v
    }
  }
  return out
}

function write(level: LogLevel, event: string, ctx: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "test") return
  const entry = { ts: new Date().toISOString(), level, event, ...sanitizeCtx(ctx) }
  if (level === "error") {
    console.error(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export const log = {
  info:  (event: string, ctx?: Record<string, unknown>) => write("info", event, ctx),
  warn:  (event: string, ctx?: Record<string, unknown>) => write("warn", event, ctx),
  error: (event: string, ctx?: Record<string, unknown>) => write("error", event, ctx),
}
