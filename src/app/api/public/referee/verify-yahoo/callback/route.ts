// Public, no-login route. Yahoo redirects the referee's browser here after
// they sign in (or cancel) at login.yahoo.com — see yahoo-sign-in-button.tsx
// for how they got there. Unlike verify-google (which the client POSTs an
// already-issued ID token to), this GET route does the whole OAuth code
// exchange itself (yahoo-verify.ts), since Yahoo has no client-side SDK
// that hands back a token directly, then redirects back to /referee with
// the outcome — landing back on that page re-triggers its own load effect,
// which picks up the now-persisted googleVerified flag exactly as a plain
// page refresh would after Google verification succeeds.
import { NextRequest, NextResponse } from "next/server";
import { verifyRefereeToken } from "@/lib/forms/tokens";
import { loadRefereeFormData, recordGoogleVerification } from "@/lib/forms/referee-form";
import { exchangeYahooCode, isYahooConfigured } from "@/lib/forms/yahoo-verify";
import { rateLimit } from "@/lib/rate-limit";

function appUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_APP_URL environment variable.");
  return base.replace(/\/$/, "");
}

// `token` here is always the referee's own signed form token (round-tripped
// through Yahoo as `state`, see yahoo-sign-in-button.tsx) — redirecting
// back through /referee?token=... rather than resolving the outcome
// in-place is deliberate: it's the exact same URL shape a plain page
// refresh already produces, so the page's existing load-effect handles
// "already verified" with no new client-side logic to keep in sync.
function redirectTo(token: string, params: Record<string, string> = {}) {
  const url = new URL(`${appUrl()}/referee`);
  url.searchParams.set("token", token);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "public:referee:verify-yahoo", { limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const searchParams = request.nextUrl.searchParams;
  const state = searchParams.get("state") ?? "";
  const code = searchParams.get("code");
  // Set by Yahoo itself when the referee cancels/denies at login.yahoo.com
  // (typically "access_denied") rather than a `code` ever being issued.
  const oauthError = searchParams.get("error");

  const payload = await verifyRefereeToken(state);
  if (!payload) {
    // No valid token to redirect back to with context — nothing safe to
    // show but the plain "missing token" state /referee already renders.
    return NextResponse.redirect(`${appUrl()}/referee`);
  }

  if (!code || oauthError) {
    return redirectTo(state, { verifyError: "failed" });
  }

  // The sign-in button only renders once NEXT_PUBLIC_YAHOO_OAUTH_CLIENT_ID
  // and NEXT_PUBLIC_APP_URL are set client-side (yahoo-sign-in-button.tsx),
  // but YAHOO_OAUTH_CLIENT_SECRET is server-only and unchecked there — a
  // referee can still land here mid-flow if only the secret is missing.
  // Surface that distinctly from a generic "failed" so retrying isn't
  // suggested for something retrying can't fix.
  if (!isYahooConfigured()) {
    console.error("[api/public/referee/verify-yahoo/callback] Yahoo OAuth is not fully configured");
    return redirectTo(state, { verifyError: "not_configured" });
  }

  try {
    const existing = await loadRefereeFormData(payload.refCheckId, payload.refereeNum);
    if (!existing || existing.alreadySubmitted) {
      return redirectTo(state, { verifyError: "failed" });
    }

    const identity = await exchangeYahooCode(code);
    if (!identity) {
      return redirectTo(state, { verifyError: "failed" });
    }

    const { verified } = await recordGoogleVerification(payload.refCheckId, payload.refereeNum, identity.email);
    if (!verified) {
      return redirectTo(state, { verifyError: "mismatch", verifiedEmail: identity.email });
    }
    return redirectTo(state);
  } catch (err) {
    console.error("[api/public/referee/verify-yahoo/callback] failed:", err);
    return redirectTo(state, { verifyError: "failed" });
  }
}
