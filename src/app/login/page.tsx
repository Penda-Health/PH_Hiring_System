"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";

export default function LoginPage() {
  const { user, login, loginWithGoogle, error, supabaseConfigured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-penda-bg via-[#EAFBF6] to-[#DCF3EC] dark:from-[#0A1F1F] dark:via-[#0C1818] dark:to-[#091414] px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-penda-teal">Penda✨ Hiring</CardTitle>
          <CardDescription>Sign in with your @penda.co.ke account</CardDescription>
        </CardHeader>
        <CardContent>
          {supabaseConfigured ? (
            <form onSubmit={handleGoogleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full bg-penda-teal hover:bg-penda-teal-dark" disabled={submitting}>
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
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full bg-penda-teal hover:bg-penda-teal-dark" disabled={submitting}>
                {submitting ? "Signing in..." : "Continue with Google"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Mock auth (Supabase not configured) — try samwel.k@penda.co.ke
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
