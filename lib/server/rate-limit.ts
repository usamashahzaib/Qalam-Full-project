export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  
  constructor(private capacity: number, private refillRatePerSec: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  tryConsume(tokens = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  private refill() {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    const newTokens = Math.floor(elapsedSec * this.refillRatePerSec);
    if (newTokens > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }
}

// In-memory store (works per-isolate on Edge/Serverless)
// For a billion-dollar production app, this would wrap Upstash Redis.
const limiters = new Map<string, TokenBucket>();

export const rateLimit = (identifier: string, limit = 5, windowSec = 60): boolean => {
  if (!limiters.has(identifier)) {
    limiters.set(identifier, new TokenBucket(limit, limit / windowSec));
  }
  const bucket = limiters.get(identifier)!;
  return bucket.tryConsume(1);
}
