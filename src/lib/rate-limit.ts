// Tiny in-memory token bucket. Sufficient for a single-VM self-hosted deploy
// with two users. Swap for Upstash if you ever scale horizontally.

type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, opts: { capacity: number; refillPerSec: number }): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: opts.capacity, updatedAt: now };
  const elapsed = (now - b.updatedAt) / 1000;
  b.tokens = Math.min(opts.capacity, b.tokens + elapsed * opts.refillPerSec);
  b.updatedAt = now;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets.set(key, b);
    return { ok: true, retryAfterMs: 0 };
  }
  buckets.set(key, b);
  const retryAfterMs = Math.ceil(((1 - b.tokens) / opts.refillPerSec) * 1000);
  return { ok: false, retryAfterMs };
}
