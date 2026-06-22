import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./config";

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
