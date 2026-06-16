import type { NextConfig } from "next";

// Note: Content-Security-Policy is set in middleware.ts (per-request nonce), not here.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  output: "standalone",
  // Hide the floating Next badge in the bottom-left during dev.
  devIndicators: false,
  experimental: {
    serverActions: {
      // server actions are same-origin POSTs; this is belt-and-braces.
      allowedOrigins: process.env.AUTH_URL ? [new URL(process.env.AUTH_URL).host] : undefined,
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
