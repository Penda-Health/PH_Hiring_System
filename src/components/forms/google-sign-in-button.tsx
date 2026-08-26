"use client";

// Renders Google's own "Sign in with Google" button via Google Identity
// Services (GIS) — a separate, decoupled flow from the staff Supabase OAuth
// login (see src/lib/forms/google-verify.ts for why). No redirect, no
// cookies: GIS hands back a signed ID token straight to `onCredential`,
// which the caller posts to a server route for verification.
import * as React from "react";
import Script from "next/script";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({
  onCredential,
  disabled,
}: {
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = React.useState(false);
  // Keep the latest callback in a ref so re-renders don't force us to
  // re-initialize/re-render the Google button (which would flicker it).
  const onCredentialRef = React.useRef(onCredential);
  onCredentialRef.current = onCredential;

  React.useEffect(() => {
    if (!scriptReady || !clientId || !containerRef.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => onCredentialRef.current(response.credential),
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      width: 320,
    });
  }, [scriptReady, clientId]);

  if (!clientId) {
    return (
      <p className="text-sm text-destructive">
        Google sign-in isn&apos;t configured for this environment. Contact careers@pendahealth.com.
      </p>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </div>
  );
}
