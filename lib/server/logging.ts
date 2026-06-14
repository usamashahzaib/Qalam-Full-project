import "server-only"

type LogLevel = "info" | "warn" | "error"

function write(level: LogLevel, event: string, ctx: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "test") return
  const entry = { ts: new Date().toISOString(), level, event, ...ctx }
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
