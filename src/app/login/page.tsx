"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";

const REDIRECT_ERROR_MESSAGES: Record<string, string> = {
  domain_restricted: "Access restricted to Penda Health staff. Use your @penda.co.ke or @pendahealth.com Google account.",
  auth_failed: "Sign-in failed. Please try again.",
};

// Standard 4-color Google "G" mark — kept as inline SVG so the button has no
// extra image request and renders crisply at any size.
function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function LoginForm() {
  const { user, login, loginWithGoogle, error, supabaseConfigured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const redirectErrorCode = searchParams.get("error");
  const redirectError = redirectErrorCode ? REDIRECT_ERROR_MESSAGES[redirectErrorCode] ?? "Sign-in failed. Please try again." : null;
  const displayError = error ?? redirectError;

  React.useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  async function handleGoogleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await loginWithGoogle();
    setSubmitting(false);
  }

  async function handleMockSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await login(email);
    setSubmitting(false);
  }

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="items-center text-center">
        <Image
          src="/assets/logo.webp"
          alt="Penda Health"
          width={72}
          height={72}
          className="mb-2 h-16 w-16 object-contain"
        />
        <CardTitle className="text-2xl text-penda-teal">Penda Hiring</CardTitle>
        <CardDescription>Sign in with your @penda.co.ke or @pendahealth.com account</CardDescription>
      </CardHeader>
      <CardContent>
        {supabaseConfigured ? (
          <form onSubmit={handleGoogleSubmit} className="space-y-4">
            {displayError && <p className="text-sm text-destructive">{displayError}</p>}
            <Button
              type="submit"
              variant="outline"
              className="w-full gap-2.5 border-border bg-white text-sm font-medium text-foreground/90 hover:bg-muted/60 dark:bg-white dark:text-neutral-800"
              disabled={submitting}
            >
              <GoogleIcon />
              {submitting ? "Redirecting…" : "Continue with Google"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMockSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="you@penda.co.ke"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {displayError && <p className="text-sm text-destructive">{displayError}</p>}
            <Button
              type="submit"
              variant="outline"
              className="w-full gap-2.5 border-border bg-white text-sm font-medium text-foreground/90 hover:bg-muted/60 dark:bg-white dark:text-neutral-800"
              disabled={submitting}
            >
              <GoogleIcon />
              {submitting ? "Signing in..." : "Continue with Google"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Mock auth (Supabase not configured) — try samwel.k@penda.co.ke
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-penda-bg via-[#EAFBF6] to-[#DCF3EC] dark:from-[#0A1F1F] dark:via-[#0C1818] dark:to-[#091414] px-4">
      <React.Suspense fallback={null}>
        <LoginForm />
      </React.Suspense>
    </div>
  );
}
