// Zero-dependency per-IP rate limiting and Same-Origin CSRF guard for Cloudflare Pages Functions.

import { jsonResponse } from "./clinic-store";

type BucketEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, BucketEntry>();

/** Extracts client IP from Cloudflare/proxy headers, falling back to "local" in unit tests. */
export function clientIp(request: Request): string {
  const cf = request.headers.get("CF-Connecting-IP")?.trim();
  if (cf) return cf;
  const xff = request.headers.get("X-Forwarded-For");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "local";
}

/** Fixed-window in-memory rate limiter keyed by `<bucket>:<key>`. */
export function checkRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  if (buckets.size > 5000) {
    for (const [k, entry] of buckets.entries()) {
      if (entry.resetAt <= now) buckets.delete(k);
    }
  }

  const composite = `${bucket}:${key}`;
  const current = buckets.get(composite);
  if (!current || current.resetAt <= now) {
    buckets.set(composite, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (current.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  current.count += 1;
  return { ok: true };
}

/** Standard 429 Too Many Requests JSON response with Retry-After + security headers. */
export function rateLimitResponse(
  retryAfterSec: number,
  message = "Too many attempts. Please wait a few minutes and try again.",
): Response {
  return jsonResponse({ ok: false, error: message }, 429, {
    "Retry-After": String(retryAfterSec),
  });
}

/** Rejects cross-origin state-changing requests (including Origin: null from sandboxed frames). */
export function checkSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  let targetHost: string;
  try {
    targetHost = new URL(request.url).host;
  } catch {
    return jsonResponse({ ok: false, error: "Cross-origin request forbidden." }, 403);
  }
  try {
    const originHost = new URL(origin).host;
    if (originHost && originHost === targetHost) return null;
  } catch {
    // Malformed or "null" Origin
  }
  return jsonResponse({ ok: false, error: "Cross-origin request forbidden." }, 403);
}

/** Clears all rate limit counters (for deterministic unit tests). */
export function resetRateLimits(): void {
  buckets.clear();
}
