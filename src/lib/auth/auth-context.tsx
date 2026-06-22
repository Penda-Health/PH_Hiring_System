"use client";

import * as React from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { users } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ALLOWED_DOMAIN = "penda.co.ke";
const STORAGE_KEY = "penda-hiring-session";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  supabaseConfigured: boolean;
  loginWithGoogle: () => Promise<void>;
  /** Legacy mock sign-in, only used while Supabase isn't provisioned yet. */
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function userFromSession(session: Session): User {
  const email = session.user.email ?? "";
  const name =
    (session.user.user_metadata?.full_name as string | undefined) ??
    (session.user.user_metadata?.name as string | undefined) ??
    email;
  return {
    id: session.user.id,
    name,
    email,
    // No `profiles` table yet (SETUP.md 4.1) — everyone defaults to
    // Recruiter until that's built and an admin promotes them.
    role: "Recruiter",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  const supabaseRef = React.useRef<SupabaseClient | null>(null);
  if (supabaseRef.current === null) {
    supabaseRef.current = createSupabaseBrowserClient();
  }
  const supabase = supabaseRef.current;
  const supabaseConfigured = supabase !== null;

  React.useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setUser(data.session ? userFromSession(data.session) : null);
        setLoading(false);
      });
      const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session ? userFromSession(session) : null);
      });
      return () => subscription.subscription.unsubscribe();
    }

    // Legacy mock auth fallback — remove once Supabase is provisioned.
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const match = users.find((u) => u.id === stored);
      if (match) setUser(match);
    }
    setLoading(false);
  }, [supabase]);

  const loginWithGoogle = React.useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured yet. See SETUP.md to provision it.");
      return;
    }
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, [supabase]);

  const login = React.useCallback(
    async (email: string) => {
      if (supabase) {
        await loginWithGoogle();
        return;
      }
      setError(null);
      const normalized = email.trim().toLowerCase();

      if (!normalized.endsWith(`@${ALLOWED_DOMAIN}`)) {
        setError(`Access restricted to @${ALLOWED_DOMAIN} accounts`);
        return;
      }

      const match = users.find((u) => u.email.toLowerCase() === normalized);
      if (!match) {
        setError("No account found for that email in the hiring system");
        return;
      }

      setUser(match);
      window.localStorage.setItem(STORAGE_KEY, match.id);
    },
    [supabase, loginWithGoogle]
  );

  const logout = React.useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setUser(null);
    router.push("/login");
  }, [supabase, router]);

  return (
    <AuthContext.Provider value={{ user, loading, error, supabaseConfigured, loginWithGoogle, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
