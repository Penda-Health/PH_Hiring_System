// Detects which identity provider can verify a given email address, so
// /referee can show the matching "Sign in with ___" button automatically
// instead of always defaulting to Google — see referee/page.tsx's
// IdentityVerificationStep. Google Identity Services only authenticates
// people who already have a Google Account, and most Yahoo Mail users
// don't — so a referee whose email on file is a Yahoo-family address needs
// Yahoo's own OAuth flow (yahoo-verify.ts) instead, not a "couldn't verify"
// dead end.
//
// Deliberately narrow: only the free-mail domains each provider's identity
// platform is actually built for. A custom/Workspace domain (or anything
// else) falls back to "google" — unchanged from this app's pre-Yahoo
// behavior — since a Google Account can be registered on any domain, while
// Yahoo's OAuth realistically only ever matches its own domains.
export type EmailProvider = "google" | "yahoo";

// Yahoo's own consumer-mail domains, regional variants included, plus the
// two legacy aliases (ymail.com, rocketmail.com) Yahoo still honors.
const YAHOO_DOMAINS = new Set([
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "yahoo.co.jp",
  "yahoo.ca",
  "yahoo.com.au",
  "yahoo.com.br",
  "yahoo.co.id",
  "yahoo.co.ke",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.it",
  "yahoo.es",
  "yahoo.ie",
  "yahoo.in",
  "ymail.com",
  "rocketmail.com",
]);

export function detectEmailProvider(email: string): EmailProvider {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (YAHOO_DOMAINS.has(domain)) return "yahoo";
  return "google";
}
