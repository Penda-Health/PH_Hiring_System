import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/config";

const ALLOWED_DOMAINS = ["penda.co.ke", "pendahealth.com"];

export async function middleware(request: NextRequest) {
  const env = getSupabaseEnv();
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  // Supabase isn't provisioned yet (see SETUP.md sections 2-4) — fall back to
  // the existing client-side-only auth gate instead of locking everyone out.
  // Remove this branch once NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
  // are set, at which point every request below is enforced server-side.
  if (!env) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isLoginPage && !isAuthCallback) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Defense in depth on top of the Supabase Auth Hook (SETUP.md section 4)
  // that rejects sign-ins outside the allowed domains at token issuance.
  const email = user.email?.toLowerCase();
  if (!email || !ALLOWED_DOMAINS.some((domain) => email.endsWith(`@${domain}`))) {
    await supabase.auth.signOut();
    if (isApiRoute) {
      return NextResponse.json({ error: "Access restricted to Penda Health staff." }, { status: 403 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "domain_restricted");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
