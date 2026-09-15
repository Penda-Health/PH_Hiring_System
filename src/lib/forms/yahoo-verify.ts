// Server-only. Verifies a Yahoo OpenID Connect identity for referee
// identity checks on /referee — the Yahoo-domain counterpart to
// google-verify.ts, shown instead of "Sign in with Google" when the
// referee's email on file is a Yahoo-family address (email-provider.ts),
// since a Yahoo Mail user very likely has no Google Account to sign in
// with at all.
//
// Structurally different from Google's flow: Google Identity Services hands
// the browser a signed ID token directly, no redirect and no server-side
// exchange. Yahoo has no equivalent no-redirect SDK — this is a standard
// OAuth 2.0 Authorization Code flow (endpoints confirmed live against
// https://api.login.yahoo.com/.well-known/openid-configuration): the
// referee's browser is sent to login.yahoo.com
// (yahoo-sign-in-button.tsx builds that URL client-side, since the client
// ID and app URL are both public), Yahoo redirects back to our callback
// route with a `code`, and *that* is exchanged here, server-side, using
// YAHOO_OAUTH_CLIENT_SECRET — which never reaches the browser — for an ID
// token, verified against Yahoo's own JWKS the same way google-verify.ts
// verifies Google's.
import { createRemoteJWKSet, jwtVerify } from "jose";

const YAHOO_TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token";
const YAHOO_JWKS_URL = "https://api.login.yahoo.com/openid/v1/certs";
const YAHOO_ISSUERS = ["https://api.login.yahoo.com", "api.login.yahoo.com"];

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(YAHOO_JWKS_URL));
  return jwks;
}

function clientId(): string {
  // NEXT_PUBLIC_ because the redirect URL is built client-side (see
  // yahoo-sign-in-button.tsx) — same reasoning as Google's clientId() in
  // google-verify.ts. Not a secret; the client secret below is what's kept
  // server-only.
  const value = process.env.NEXT_PUBLIC_YAHOO_OAUTH_CLIENT_ID;
  if (!value) throw new Error("Missing NEXT_PUBLIC_YAHOO_OAUTH_CLIENT_ID environment variable.");
  return value;
}

function clientSecret(): string {
  const value = process.env.YAHOO_OAUTH_CLIENT_SECRET;
  if (!value) throw new Error("Missing YAHOO_OAUTH_CLIENT_SECRET environment variable.");
  return value;
}

function appUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_APP_URL environment variable.");
  return base.replace(/\/$/, "");
}

// Must exactly match the "Authorized redirect URIs" registered in the
// Yahoo Developer Network app (see SETUP.md) — Yahoo rejects a token
// exchange whose redirect_uri doesn't match the one used to start the
// flow, byte for byte.
function redirectUri(): string {
  return `${appUrl()}/api/public/referee/verify-yahoo/callback`;
}

// Lets callers (the referee-page verify step) tell a real "not configured
// in this environment" state apart from an in-flight/failed attempt,
// mirroring google-sign-in-button.tsx's own missing-clientId message.
export function isYahooConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_YAHOO_OAUTH_CLIENT_ID && process.env.YAHOO_OAUTH_CLIENT_SECRET);
}

export type YahooVerifiedIdentity = {
  email: string;
  emailVerified: boolean;
};

/**
 * Exchanges the `code` Yahoo's callback redirect handed us for tokens, then
 * verifies the resulting ID token against Yahoo's own JWKS — same
 * distrust-the-transport, verify-the-signature posture as
 * verifyGoogleIdToken. Returns null on any failure (expired/reused code,
 * bad signature, unverified email, misconfigured env) rather than
 * throwing, so the callback route can treat every failure mode as one
 * "couldn't verify" outcome.
 */
export async function exchangeYahooCode(code: string): Promise<YahooVerifiedIdentity | null> {
  try {
    const res = await fetch(YAHOO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Yahoo's token endpoint authenticates the app via HTTP Basic auth
        // (client_id:client_secret), not a body param.
        Authorization: `Basic ${Buffer.from(`${clientId()}:${clientSecret()}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        redirect_uri: redirectUri(),
        code,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[yahoo-verify] token exchange failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const body = (await res.json()) as { id_token?: string };
    if (!body.id_token) return null;

    const { payload } = await jwtVerify(body.id_token, getJwks(), {
      issuer: YAHOO_ISSUERS,
      audience: clientId(),
    });
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    // Yahoo's ID token doesn't always carry an explicit email_verified
    // claim the way Google's does; when present, honor it, but its mere
    // absence isn't a reason to reject — Yahoo only ever includes `email`
    // in the id_token for an account whose email is itself confirmed.
    const emailVerified = payload.email_verified === undefined ? true : payload.email_verified === true;
    if (!email || !emailVerified) return null;
    return { email, emailVerified };
  } catch (err) {
    console.error("[yahoo-verify] verification failed:", err);
    return null;
  }
}
