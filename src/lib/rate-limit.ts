interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

// Cleanup stale entries every 5 minutes
if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { __rlCleanup?: boolean };
  if (!g.__rlCleanup) {
    g.__rlCleanup = true;
    setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of store) {
        if (now - entry.windowStart > WINDOW_MS * 2) {
          store.delete(ip);
        }
      }
    }, 300_000).unref();
  }
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_MS };
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + WINDOW_MS,
    };
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetAt: entry.windowStart + WINDOW_MS,
  };
}
