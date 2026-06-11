import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

type SearchParams = Promise<{ error?: string }>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getSessionUser();
  if (user) redirect("/today");
  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-[var(--color-app-surface)] p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl border flex items-center justify-center mb-4 text-xl brand-mark">▦</div>
        <h1 className="text-xl font-medium mb-1 brand-mark">HomePanel</h1>
        <p className="text-sm text-[var(--color-app-muted)] mb-6">
          A shared household for calendar, shopping, notes and kanban.
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/auth/signin/discord?callbackUrl=%2Ftoday"
          className="inline-flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
          style={{ background: "#5865F2" }}
        >
          <span aria-hidden>◆</span>
          Continue with Discord
        </a>
        {error ? (
          <p className="mt-4 text-xs text-red-600">
            {error === "AccessDenied"
              ? "Your Discord account isn't on the allow-list."
              : "Sign-in failed. Try again."}
          </p>
        ) : (
          <p className="mt-4 text-xs text-[var(--color-app-muted)]">
            Only the allow-listed Discord accounts can sign in.
          </p>
        )}
      </div>
    </main>
  );
}
