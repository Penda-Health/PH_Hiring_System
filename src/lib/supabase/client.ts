"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./config";

// Returns null when NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// aren't set yet, so callers can fall back to the legacy mock auth until
// Supabase is provisioned (see SETUP.md sections 2-4).
export function createSupabaseBrowserClient() {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createBrowserClient(env.url, env.anonKey);
}
