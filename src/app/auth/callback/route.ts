import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Only allow same-site relative paths — a bare "/x" is safe, but
// "//evil.com" or "https://evil.com" are protocol-relative/absolute URLs
// that would redirect off-site after a successful sign-in.
function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error(
        "[auth/callback] exchangeCodeForSession failed",
        JSON.stringify({
          name: error.name,
          message: error.message,
          status: error.status,
          code: error.code,
        })
      );
      if (/restricted to penda health staff/i.test(error.message ?? "")) {
        return NextResponse.redirect(`${origin}/login?error=domain_restricted`);
      }
    } else {
      console.error("[auth/callback] createSupabaseServerClient() returned null — env vars not configured");
    }
  } else {
    console.error("[auth/callback] no ?code= param on callback request");
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
