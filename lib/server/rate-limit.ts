// TODO: Replace with Upstash Redis before production launch.

type WindowCounter = {
  count: number
  expiresAt: number
}

const counters = new Map<string, WindowCounter>()

const cleanup = () => {
  const now = Date.now()
  for (const [key, item] of counters) {
    if (item.expiresAt <= now) counters.delete(key)
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(cleanup, 60_000).unref?.()
}

export function rateLimit(key: string, maxRequests: number, windowSeconds: number): boolean {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const windowKey = `${key}:${Math.floor(now / windowMs)}`
  const current = counters.get(windowKey)

  if (!current || current.expiresAt <= now) {
    counters.set(windowKey, { count: 1, expiresAt: now + windowMs })
    return true
  }

  if (current.count >= maxRequests) return false
  current.count += 1
  return true
}
