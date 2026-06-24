import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { isRouteAllowed } from "@/lib/permissions";
import type { UserRoleName } from "@/types";

const ALLOWED_DOMAINS = ["penda.co.ke", "pendahealth.com"];

export async function middleware(request: NextRequest) {
  const env = getSupabaseEnv();
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  // No-login public forms (candidate work-trial selection, branch-manager
  // feedback) and the Airtable-automation link issuer authenticate via their
  // own signed token / bearer secret instead of a Supabase session — see
  // src/lib/forms/tokens.ts and src/app/api/forms/issue-link/route.ts.
  const isPublicFormRoute =
    request.nextUrl.pathname.startsWith("/work-trial") ||
    request.nextUrl.pathname.startsWith("/bm-feedback") ||
    request.nextUrl.pathname.startsWith("/referee") ||
    request.nextUrl.pathname.startsWith("/api/public/") ||
    request.nextUrl.pathname.startsWith("/api/forms/issue-link");
  if (isPublicFormRoute) return NextResponse.next();

  // Supabase isn't provisioned yet (see SETUP.md sections 2-4) — fall back to
  // the existing client-side-only auth gate instead of locking everyone out.
  // Remove this branch once NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
  // are set, at which point every request below is enforced server-side.
  //
  // In production this must fail closed instead: a missing env var there is
  // a deploy misconfiguration, not "not set up yet", and silently disabling
  // auth would expose every route.
  if (!env) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[middleware] NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY are missing in production — blocking all requests"
      );
      if (isApiRoute) {
        return NextResponse.json({ error: "Service misconfigured" }, { status: 503 });
      }
      return new NextResponse("Service temporarily unavailable. Please contact an administrator.", {
        status: 503,
      });
    }
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

  // Role-gated routes (SETUP.md section 4.6) — e.g. /settings is
  // recruitment_manager-only. A missing/unreadable profile row fails closed
  // (treated as no role) rather than open.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role as UserRoleName | undefined;
  if (!isRouteAllowed(request.nextUrl.pathname, role)) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
