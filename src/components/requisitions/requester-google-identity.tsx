"use client";

// "Who's asking" block on the public requisition-request links: the
// requester signs in with their Penda Google account instead of typing an
// email, so every request is tied to a real account (and that's the address
// approval updates go to). The credential is only *read* here for display —
// /api/public/requisition-request verifies it server-side.
import * as React from "react";
import { GoogleSignInButton } from "@/components/forms/google-sign-in-button";
import { isPendaEmail } from "@/lib/airtable/schemas";

type Claims = { email?: string; name?: string };

function readClaims(credential: string): Claims {
  try {
    const part = credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(decodeURIComponent(escape(atob(padded)))) as Claims;
  } catch {
    return {};
  }
}

export type RequesterIdentity = { credential: string; email: string; name?: string };

export function RequesterGoogleIdentity({
  identity,
  onChange,
}: {
  identity: RequesterIdentity | null;
  onChange: (identity: RequesterIdentity | null) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);

  function handleCredential(credential: string) {
    const claims = readClaims(credential);
    const email = claims.email?.toLowerCase() ?? "";
    if (!isPendaEmail(email)) {
      setError(`${email || "That account"} isn't a Penda Google account. Sign in with your @pendahealth.com account.`);
      onChange(null);
      return;
    }
    setError(null);
    onChange({ credential, email, name: claims.name });
  }

  if (identity) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <span>
          Signed in as <span className="font-medium">{identity.email}</span>
        </span>
        <button type="button" className="text-xs text-penda-blue underline" onClick={() => onChange(null)}>
          Use a different account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Sign in with your Penda Google account. Your request is linked to it, and approval updates go to that address.
      </p>
      <GoogleSignInButton onCredential={handleCredential} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
