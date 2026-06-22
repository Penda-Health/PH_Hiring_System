import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
      if (/restricted to penda health staff/i.test(error.message)) {
        return NextResponse.redirect(`${origin}/login?error=domain_restricted`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
