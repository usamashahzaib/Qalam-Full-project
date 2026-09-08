import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"

vi.mock("next-auth/jwt", () => ({ getToken: vi.fn().mockResolvedValue(null) }))
import { proxy } from "@/proxy"

describe("installed app resources", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "")
  })
  it.each(["/sw.js", "/offline.html", "/manifest.webmanifest"])("serves %s on the app origin without a cross-origin redirect", async (path) => {
    const response = await proxy(new NextRequest(`https://app.byqalam.com${path}`))
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("x-middleware-next")).toBe("1")
  })
  it("still redirects marketing pages away from the app origin", async () => {
    const response = await proxy(new NextRequest("https://app.byqalam.com/pricing"))
    expect(response.headers.get("location")).toBe("https://www.byqalam.com/pricing")
  })
  it("caches a static offline page instead of session-bearing HTML", async () => {
    const listeners: Record<string, (event: { waitUntil: (promise: Promise<unknown>) => void }) => void> = {}
    const add = vi.fn().mockResolvedValue(undefined)
    runInNewContext(readFileSync("public/sw.js", "utf8"), {
      self: { addEventListener: (name: string, fn: typeof listeners[string]) => { listeners[name] = fn }, skipWaiting: vi.fn(), clients: { claim: vi.fn() } },
      caches: { open: vi.fn().mockResolvedValue({ add }) },
      Request: class { constructor(public url: string) {} },
    })
    let installation: Promise<unknown> = Promise.resolve()
    listeners.install({ waitUntil: (promise) => { installation = promise } })
    await installation
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ url: "/offline.html" }))
  })
})
