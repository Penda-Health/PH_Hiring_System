// In-memory, fixed-window rate limiter for public, no-login API routes
// (src/app/api/public/*). These endpoints have no session/auth boundary —
// a signed token or nothing at all — so this is the backstop against
// scripted abuse (mass record creation, token brute-forcing, candidate
// lookup enumeration).
//
// Single-process only: state lives in a module-level Map, so it resets on
// deploy and isn't shared across instances. That's fine for this app's
// current single-instance `next start` deployment; if it ever runs behind
// multiple instances/a load balancer, swap this for a shared store (Redis,
// Upstash, etc.) — the call sites won't need to change.
import { NextRequest, NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Sweep expired buckets occasionally so the map doesn't grow unbounded over
// the life of the process. Piggybacks on request traffic rather than a
// timer, so it costs nothing when the app is idle.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();
function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) buckets.delete(key);
  });
}

export function getClientIp(request: NextRequest): string {
  // Behind a proxy/load balancer, x-forwarded-for carries the real client
  // IP as the first entry. Falls back to x-real-ip, then a constant — worst
  // case (neither header present) all callers share one bucket, which is a
  // stricter failure mode than no limiting at all.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window rate limit keyed by `${routeKey}:${clientIp}`. Returns a 429
 * NextResponse if the caller is over budget, or null if the request should
 * proceed — call sites just do `const limited = rateLimit(...); if (limited) return limited;`
 */
export function rateLimit(
  request: NextRequest,
  routeKey: string,
  opts: { limit: number; windowMs: number }
): NextResponse | null {
  const now = Date.now();
  cleanup(now);

  const key = `${routeKey}:${getClientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > opts.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }
  return null;
}
