import type { NextConfig } from "next";

/**
 * Applied to every route. The CSP is deliberately limited to
 * frame-ancestors: a full script-src policy needs per-request nonces for
 * Next's inline bootstrap scripts, and a wrong one blanks the page — the
 * job here is to stop clickjacking of the signed-in pages (sign-out, role
 * switcher), which frame-ancestors alone does.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), camera=(), microphone=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
