// Supabase sits behind a gateway that occasionally answers 502/503/504 or drops
// the connection for a moment. A single blip used to fail the workspace boot
// and show "Workspace unavailable". Reads are safe to repeat, so they retry a
// few times with a short backoff. Writes are never retried here: a POST or
// PATCH that reached the database before the gateway failed must not run twice.

const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524])
const RETRY_METHODS = new Set(["GET", "HEAD"])
const BACKOFF_MS = [150, 400, 900]

const methodOf = (input: RequestInfo | URL, init?: RequestInit) =>
  (init?.method || (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")).toUpperCase()

const wait = (ms: number, signal?: AbortSignal | null) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => { clearTimeout(timer); resolve() }, { once: true })
  })

export async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, baseFetch: typeof fetch = fetch): Promise<Response> {
  if (!RETRY_METHODS.has(methodOf(input, init))) return baseFetch(input, init)

  for (let attempt = 0; ; attempt++) {
    const last = attempt >= BACKOFF_MS.length
    try {
      const response = await baseFetch(input, init)
      if (last || !RETRY_STATUS.has(response.status)) return response
      await response.body?.cancel().catch(() => undefined)
    } catch (error) {
      if (last || init?.signal?.aborted || (error as Error).name === "AbortError") throw error
    }
    await wait(BACKOFF_MS[attempt], init?.signal)
    if (init?.signal?.aborted) return baseFetch(input, init)
  }
}
