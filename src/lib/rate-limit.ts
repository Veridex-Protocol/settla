/**
 * VDX-AUTH-010: In-memory rate limiter for API endpoints.
 *
 * Sliding-window counter keyed on IP address (forwarded via X-Forwarded-For).
 * Production multi-instance deployments should replace with Redis-backed store.
 */

interface WindowEntry {
  count: number;
  resetAt: number; // ms timestamp
}

const store = new Map<string, WindowEntry>();

const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

function sweep(): void {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check/consume a rate-limit token.
 *
 * @param key      Unique identifier (typically IP or IP + route)
 * @param limit    Max requests per window
 * @param windowMs Window duration in milliseconds (default 60 000 = 1 min)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000,
): RateLimitResult {
  sweep();

  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract a client IP from a Next.js request (respects X-Forwarded-For).
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    // Take first IP in chain (client)
    return xff.split(',')[0].trim();
  }
  return headers.get('x-real-ip') || '127.0.0.1';
}
