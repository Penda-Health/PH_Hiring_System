"use client";

import * as React from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { users } from "@/lib/mock-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchOwnProfile } from "@/lib/supabase/profiles";

const ALLOWED_DOMAINS = ["penda.co.ke", "pendahealth.com"];
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
  /** Re-fetch the signed-in user's profile row, e.g. after saving /profile edits. */
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function fallbackUserFromSession(session: Session): User {
  const email = session.user.email ?? "";
  const name =
    (session.user.user_metadata?.full_name as string | undefined) ??
    (session.user.user_metadata?.name as string | undefined) ??
    email;
  return {
    id: session.user.id,
    name,
    email,
    // The `profiles` row should exist via the handle_new_user trigger
    // (SETUP.md 4.6) — this only fires if that row can't be read yet
    // (trigger not wired up, or RLS not applied). Defaults to the
    // least-privileged role rather than failing closed.
    role: "contributor",
  };
}

async function userFromSession(supabase: SupabaseClient, session: Session): Promise<User> {
  const profile = await fetchOwnProfile(supabase, session.user.id);
  return profile ?? fallbackUserFromSession(session);
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
      supabase.auth.getSession().then(async ({ data }) => {
        setUser(data.session ? await userFromSession(supabase, data.session) : null);
        setLoading(false);
      });
      const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          setUser(null);
          return;
        }
        userFromSession(supabase, session).then(setUser);
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

      if (!ALLOWED_DOMAINS.some((domain) => normalized.endsWith(`@${domain}`))) {
        setError(`Access restricted to ${ALLOWED_DOMAINS.map((d) => `@${d}`).join(" or ")} accounts`);
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

  const refreshProfile = React.useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (data.session) setUser(await userFromSession(supabase, data.session));
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, supabaseConfigured, loginWithGoogle, login, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
