/** @type {import('next').NextConfig} */

// Security headers applied to every response. This app has no third-party
// embeds and doesn't need to be framed by anyone, so the policy below is
// fairly strict. A few allowances are load-bearing, not laziness:
//  - script-src/style-src 'unsafe-inline': Next.js App Router ships its
//    hydration payload and next/font styles as inline <script>/<style> tags
//    with no nonce wired up (that would need per-request middleware
//    support). Tightening this further means adding CSP nonces later.
//  - connect-src includes *.supabase.co (https + wss): the browser talks to
//    Supabase directly for auth and Realtime (see src/lib/supabase/client.ts,
//    use-ips-realtime.ts) — this is not a Next.js API route, so 'self' alone
//    would break login and the IPS meeting live-update feature.
//  - script-src/connect-src/frame-src include accounts.google.com: /referee
//    renders Google Identity Services' "Sign in with Google" button
//    (src/components/forms/google-sign-in-button.tsx) to verify referee
//    identity — a separate flow from the Supabase Google OAuth login above.
//    GIS loads its script from, talks to, and renders its button/prompt via
//    an iframe from accounts.google.com, so all three directives need it or
//    the button silently never appears (no visible error, just a blocked
//    script — only shows up as a CSP violation in the browser console).
//  - frame-src includes blob:: the reference check report preview page
//    (src/app/(dashboard)/reference-checks/[id]/report/page.tsx) fetches a
//    generated PDF and embeds it via `<iframe src={URL.createObjectURL(blob)}>`
//    for inline viewing before download. Without `blob:` here the browser
//    silently blocks that iframe (again, only visible as a console CSP
//    violation, not a visible error) and the preview pane stays empty.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com",
      "frame-src https://accounts.google.com blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  // Belt-and-suspenders alongside frame-ancestors above — older browsers
  // that don't parse CSP frame-ancestors still respect this.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
