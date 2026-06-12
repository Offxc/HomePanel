import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";

// Edge-safe config — no DB adapter here. Adapter is added in `auth.ts`
// so middleware can use this slim version without dragging Prisma into edge runtime.
export const authConfig = {
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
      authorization: { params: { scope: "identify" } },
    }),
  ],
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isAuthPage = path === "/signin" || path.startsWith("/api/auth");
      if (isAuthPage) return true;
      return isLoggedIn;
    },
  },
  session: { strategy: "jwt" },
  trustHost: true,
} satisfies NextAuthConfig;
