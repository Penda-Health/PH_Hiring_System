"use client";

// Yahoo's counterpart to google-sign-in-button.tsx, shown instead of it
// when the referee's email on file is a Yahoo-family address (see
// email-provider.ts). Yahoo has no Google-Identity-Services-style
// no-redirect SDK, so unlike the Google button this is a plain full-page
// redirect to login.yahoo.com and back to
// /api/public/referee/verify-yahoo/callback, which does the actual
// server-side verification (yahoo-verify.ts) and redirects the browser
// back to this same /referee?token=... URL. The page's own load effect
// (referee/page.tsx) then picks up the now-persisted googleVerified flag
// exactly as it would after a plain page refresh — no client-side
// polling or callback wiring needed here.
import { cn } from "@/lib/utils";

export function YahooSignInButton({ token, disabled }: { token: string; disabled?: boolean }) {
  const clientId = process.env.NEXT_PUBLIC_YAHOO_OAUTH_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return (
      <p className="text-sm text-destructive">
        Yahoo sign-in isn&apos;t configured for this environment. Contact careers@pendahealth.com.
      </p>
    );
  }

  // The referee's own signed form token round-trips through Yahoo as
  // `state` — it's already a verifiable, short-lived, single-purpose JWT
  // (see tokens.ts), so there's no need to mint a second one just to
  // survive the redirect. The callback route verifies it the same way
  // every other public-form route verifies its token.
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/public/referee/verify-yahoo/callback`;
  const authorizeUrl = `https://api.login.yahoo.com/oauth2/request_auth?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email",
    state: token,
  }).toString()}`;

  return (
    <a
      href={disabled ? undefined : authorizeUrl}
      aria-disabled={disabled}
      className={cn(
        "flex h-10 w-[320px] max-w-full items-center justify-center gap-2.5 rounded-md border border-[#dadce0] bg-white text-sm font-medium text-[#3c4043] shadow-sm transition hover:bg-[#f8f9fa]",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[13px] font-extrabold text-white"
        style={{ backgroundColor: "#6001d2" }}
        aria-hidden="true"
      >
        Y!
      </span>
      Sign in with Yahoo
    </a>
  );
}
