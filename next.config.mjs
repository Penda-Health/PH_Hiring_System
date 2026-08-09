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
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
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
