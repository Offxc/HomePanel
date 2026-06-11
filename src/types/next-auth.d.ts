import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordId?: string | null;
    } & DefaultSession["user"];
  }
}
