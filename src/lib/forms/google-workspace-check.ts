// Server-only. For a referee's email on a domain that isn't a recognized
// personal-webmail provider (email-provider.ts already carves out Gmail and
// Yahoo), this is how /referee decides whether "Sign in with Google" has
// any real chance of working: Google Workspace domains route their mail
// through Google's own mail exchangers, so an MX lookup is a strong (not
// perfect) signal that accounts on this domain are actual Google Accounts.
// A company on Microsoft 365 or a custom mail server won't match — see
// verification-method.ts, which is what actually decides to skip
// verification entirely for those referees rather than showing a sign-in
// button that's virtually guaranteed to fail.
import { resolveMx } from "node:dns/promises";

const GOOGLE_MX_PATTERN = /(^|\.)google\.com$|(^|\.)googlemail\.com$/i;
const LOOKUP_TIMEOUT_MS = 3000;

// Same domain gets looked up on every /referee page load for every referee
// at that company, and MX records essentially never change day to day, so
// there's no reason to re-resolve DNS every time. Deliberately in-memory
// only (not persisted) — a cold server restart just re-warms it, which is
// fine for a lookup this cheap and this tolerant of being wrong.
const cache = new Map<string, { result: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function domainLooksLikeGoogleWorkspace(domain: string): Promise<boolean> {
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return false;

  const cached = cache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const result = await lookupWithTimeout(normalized);
  cache.set(normalized, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

// Any failure here (NXDOMAIN, no MX records, a slow/unreachable resolver)
// resolves to false rather than throwing — an inconclusive result should
// mean "don't force a Google Sign-In attempt we can't back up", the same
// as a confirmed non-Google domain, not a hard error that breaks the page.
async function lookupWithTimeout(domain: string): Promise<boolean> {
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("mx_lookup_timeout")), LOOKUP_TIMEOUT_MS);
      }),
    ]);
    return records.some((r) => GOOGLE_MX_PATTERN.test(r.exchange));
  } catch (err) {
    console.error(`[google-workspace-check] MX lookup failed for ${domain}:`, err);
    return false;
  }
}
