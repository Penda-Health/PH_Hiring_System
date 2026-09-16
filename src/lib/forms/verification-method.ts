// Server-only. Decides how (or whether) a referee's identity can be
// verified on /referee — the single source of truth loadRefereeFormData
// (referee-form.ts) exposes to both the page and the submit route's own
// server-side re-check, so the two can never disagree about who still
// needs to sign in.
//
// email-provider.ts's detectEmailProvider is a pure, synchronous guess:
// Yahoo's own domains get "yahoo", literally everything else defaults to
// "google" — a reasonable default for gmail.com, but also for any custom
// company domain, many of which aren't on Google Workspace at all (common
// on Microsoft 365, especially outside the US). Forcing "Sign in with
// Google" on those referees is a dead end they can never get past.
//
// This adds one real check on top: for anything that isn't gmail.com/
// googlemail.com itself, confirm via MX record (google-workspace-check.ts)
// that the domain is actually likely to be Google-backed before trusting
// Google Sign-In to work. If it isn't (or the check can't tell), identity
// verification is bypassed entirely for that referee rather than blocking
// them behind a sign-in flow that can't succeed — sending them an emailed
// OTP instead is a planned follow-up, not yet built.
import { detectEmailProvider } from "@/lib/forms/email-provider";
import { domainLooksLikeGoogleWorkspace } from "@/lib/forms/google-workspace-check";

export type VerificationMethod = "google" | "yahoo" | "bypassed";

const GUARANTEED_GOOGLE_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export async function resolveVerificationMethod(email: string): Promise<VerificationMethod> {
  const provider = detectEmailProvider(email);
  if (provider === "yahoo") return "yahoo";

  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (GUARANTEED_GOOGLE_DOMAINS.has(domain)) return "google";

  const looksLikeWorkspace = await domainLooksLikeGoogleWorkspace(domain);
  return looksLikeWorkspace ? "google" : "bypassed";
}
