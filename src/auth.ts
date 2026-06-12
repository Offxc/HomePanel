import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { isAllowed } from "@/lib/allowlist";
import { audit } from "@/lib/audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  events: {
    async signOut(message) {
      const userId = "token" in message
        ? (message.token as { id?: string } | null)?.id
        : undefined;
      await audit("signout", { actorId: userId ?? null });
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider !== "discord") return false;
      const discordId = (profile as { id?: string } | null)?.id ?? account.providerAccountId;
      if (!isAllowed(discordId)) {
        await audit("signin.denied", { detail: `discordId=${discordId ?? "unknown"}` });
        return false;
      }
      await audit("signin.success", { actorId: account.userId ?? null, detail: `discordId=${discordId}` });
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) token.id = user.id;
      if (account?.providerAccountId) {
        token.discordId = account.providerAccountId;
        // Backfill discordId on the user record (once, at first sign-in)
        if (user && !(user as { discordId?: string | null }).discordId) {
          await db.user.update({
            where: { id: user.id },
            data: { discordId: account.providerAccountId },
          }).catch(() => null);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.discordId = (token.discordId as string | null) ?? null;
      }
      return session;
    },
  },
});
