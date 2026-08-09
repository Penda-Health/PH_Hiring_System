import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./config";
import type { UserRoleName } from "@/types";

// Server-only client for Route Handlers and Server Components. Returns null
// when Supabase isn't provisioned yet (see SETUP.md sections 2-4).
export async function createSupabaseServerClient() {
  const env = getSupabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render — middleware already
          // refreshes the session cookie on the request/response cycle.
        }
      },
    },
  });
}

// Reads the signed-in user's role from Route Handler code (mirrors the
// lookup middleware.ts does before its own permission checks). Used where a
// route needs to enforce or apply a role-based rule itself rather than
// relying solely on middleware — e.g. masking salary fields in a GET
// response, or gating a POST that isn't a plain Airtable-table prefix.
// Returns undefined if Supabase isn't configured, there's no session, or the
// profile row can't be read — callers should treat that as "no role" (fail
// closed), same as middleware does.
export async function getCurrentUserRole(): Promise<UserRoleName | undefined> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return undefined;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return undefined;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return (profile?.role as UserRoleName | undefined) ?? undefined;
}
