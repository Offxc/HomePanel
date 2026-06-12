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
      const userId = "session" in message ? message.session?.userId : undefined;
      await audit("signout", { actorId: userId ?? null });
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      // Only Discord provider is configured; defensive check anyway.
      if (account?.provider !== "discord") return false;
      const discordId = (profile as { id?: string } | null)?.id ?? account.providerAccountId;
      if (!isAllowed(discordId)) {
        await audit("signin.denied", { detail: `discordId=${discordId ?? "unknown"}` });
        return false;
      }
      // Persist discordId on the user record (separate from email).
      const dbUser = await db.user.findUnique({ where: { id: account.userId ?? "" } }).catch(() => null);
      if (dbUser && !dbUser.discordId) {
        await db.user.update({ where: { id: dbUser.id }, data: { discordId } });
      }
      await audit("signin.success", { actorId: account.userId ?? null, detail: `discordId=${discordId}` });
      return true;
    },
    async session({ session, user }) {
      // Expose user id + discordId on the session for server actions.
      if (session.user) {
        session.user.id = user.id;
        // Read discordId from the Account table — User.discordId is populated
        // lazily and may be null on first sign-in (signIn callback runs before
        // the adapter creates the User row, so account.userId is undefined then).
        const account = await db.account.findFirst({
          where: { userId: user.id, provider: "discord" },
          select: { providerAccountId: true },
        });
        (session.user as { discordId?: string | null }).discordId = account?.providerAccountId ?? null;
      }
      return session;
    },
  },
});
