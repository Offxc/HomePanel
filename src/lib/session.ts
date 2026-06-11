import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAllowed } from "@/lib/allowlist";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  discordId: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const u = session.user as { id?: string; name?: string | null; email?: string | null; image?: string | null; discordId?: string | null };
  if (!u.id) return null;
  // Defence in depth: re-check the allow-list on every server-side load,
  // in case it was tightened after a session was already issued.
  if (!isAllowed(u.discordId)) return null;
  return {
    id: u.id,
    name: u.name ?? null,
    email: u.email ?? null,
    image: u.image ?? null,
    discordId: u.discordId ?? null,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  return user;
}
