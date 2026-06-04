import { describe, it, expect, vi, beforeEach } from "vitest"
import { TokenBucket, rateLimit } from "@/lib/server/rate-limit"

describe("TokenBucket", () => {
  it("allows up to capacity requests before exhausting", () => {
    const bucket = new TokenBucket(5, 1)
    for (let i = 0; i < 5; i++) {
      expect(bucket.tryConsume()).toBe(true)
    }
    expect(bucket.tryConsume()).toBe(false)
  })

  it("refuses when empty", () => {
    const bucket = new TokenBucket(1, 0.1)
    expect(bucket.tryConsume()).toBe(true)
    expect(bucket.tryConsume()).toBe(false)
  })

  it("refills tokens over time", () => {
    vi.useFakeTimers()
    const bucket = new TokenBucket(5, 5) // 5 tokens refill per second
    for (let i = 0; i < 5; i++) bucket.tryConsume()
    expect(bucket.tryConsume()).toBe(false)
    vi.advanceTimersByTime(1000) // +1 second → floor(1 × 5) = 5 new tokens
    expect(bucket.tryConsume()).toBe(true)
    vi.useRealTimers()
  })

  it("does not refill beyond capacity", () => {
    vi.useFakeTimers()
    const bucket = new TokenBucket(3, 3)
    vi.advanceTimersByTime(10_000) // would add 30 tokens - capped at 3
    let count = 0
    while (bucket.tryConsume()) count++
    expect(count).toBe(3)
    vi.useRealTimers()
  })

  it("only adds whole tokens (floor semantics)", () => {
    vi.useFakeTimers()
    const bucket = new TokenBucket(10, 1) // 1 token/sec
    for (let i = 0; i < 10; i++) bucket.tryConsume()
    vi.advanceTimersByTime(500) // 0.5 sec → floor(0.5) = 0 new tokens
    expect(bucket.tryConsume()).toBe(false)
    vi.advanceTimersByTime(600) // total 1.1 sec from construction → 1 token
    expect(bucket.tryConsume()).toBe(true)
    vi.useRealTimers()
  })
})

describe("rateLimit", () => {
  it("allows up to the configured limit", () => {
    const id = `qa-allow-${Date.now()}`
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(id, 5, 60)).toBe(true)
    }
    expect(rateLimit(id, 5, 60)).toBe(false)
  })

  it("blocks after limit is reached", () => {
    const id = `qa-block-${Date.now()}`
    rateLimit(id, 1, 60)
    expect(rateLimit(id, 1, 60)).toBe(false)
  })

  it("reuses the same bucket across calls for the same identifier", () => {
    const id = `qa-reuse-${Date.now()}`
    expect(rateLimit(id, 2, 60)).toBe(true)
    expect(rateLimit(id, 2, 60)).toBe(true)
    expect(rateLimit(id, 2, 60)).toBe(false) // exhausted on third call
  })

  it("different identifiers have independent buckets", () => {
    const ts = Date.now()
    const id1 = `qa-ind-a-${ts}`
    const id2 = `qa-ind-b-${ts}`
    rateLimit(id1, 1, 60) // exhaust id1
    expect(rateLimit(id1, 1, 60)).toBe(false)
    expect(rateLimit(id2, 1, 60)).toBe(true) // id2 unaffected
  })
})
