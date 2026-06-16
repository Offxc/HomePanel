import { NextResponse, type NextRequest } from "next/server";

// CSP lives here (not next.config) so we can mint a per-request nonce and drop
// 'unsafe-inline' from script-src in production. Next.js reads the nonce from the
// request's Content-Security-Policy header and stamps it onto its own inline
// bootstrap/flight scripts; our one inline script (SW registration) reads it from
// the x-nonce header in the root layout.
//
// No auth happens here — page-level requireSession() still owns that, since the
// Prisma adapter can't run in the edge runtime. This middleware only sets headers.

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://cdn.discordapp.com",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://discord.com",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js looks for the nonce on this request header to apply it to its scripts.
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Run on document routes only — skip API, static assets, icons, the manifest and SW.
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
