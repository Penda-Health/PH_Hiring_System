// Server-only. Verifies a Google Identity Services ID token for referee
// identity checks on /referee.
//
// This is intentionally NOT the same Google sign-in used for staff login
// (src/lib/auth/auth-context.tsx's loginWithGoogle -> Supabase Auth). That
// flow goes through a Postgres Auth Hook (SETUP.md section 4) which rejects
// any sign-in outside @penda.co.ke / @pendahealth.com at token issuance —
// referees are external people with arbitrary email addresses, so reusing
// it would hard-reject every one of them. Instead this uses Google
// Identity Services directly (google-identity-services.ts on the client),
// which hands back a signed ID token with no redirect, no cookies, and no
// Supabase session — verified here against Google's public JWKS using
// jose (already a dependency, used for the form JWTs in tokens.ts).
import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  return jwks;
}

function clientId(): string {
  // NEXT_PUBLIC_ because Google Identity Services needs the client ID in
  // the browser to render the sign-in button — it's not a secret (same
  // value already sits in GOOGLE_OAUTH_CLIENT_ID for the Supabase flow).
  const value = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
  if (!value) throw new Error("Missing NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID environment variable.");
  return value;
}

export type GoogleVerifiedIdentity = {
  email: string;
  emailVerified: boolean;
};

/**
 * Verifies a Google ID token (the `credential` returned by Google Identity
 * Services). Returns the verified identity, or null if the token is
 * invalid, expired, issued for a different app, or the email isn't
 * verified on Google's side.
 */
export async function verifyGoogleIdToken(credential: string): Promise<GoogleVerifiedIdentity | null> {
  try {
    const { payload } = await jwtVerify(credential, getJwks(), {
      issuer: GOOGLE_ISSUERS,
      audience: clientId(),
    });
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const emailVerified = payload.email_verified === true;
    if (!email || !emailVerified) return null;
    return { email, emailVerified };
  } catch (err) {
    console.error("[google-verify] ID token verification failed:", err);
    return null;
  }
}
