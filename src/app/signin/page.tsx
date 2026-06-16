import { SignInButton } from "./signin-button";
import { BrandMark } from "@/components/icons";

type SearchParams = Promise<{ error?: string }>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-[var(--color-app-surface)] p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl border flex items-center justify-center mb-4">
          <BrandMark size={28} />
        </div>
        <h1 className="text-xl font-medium mb-1 brand-mark">HomePanel</h1>
        <p className="text-sm text-[var(--color-app-muted)] mb-6">
          Your shared household dashboard.
        </p>
        <SignInButton />
        {error ? (
          <p className="mt-4 text-xs text-red-600">
            {error === "AccessDenied"
              ? "Your Discord account isn’t on the allow-list."
              : "Sign-in failed — try again."}
          </p>
        ) : (
          <p className="mt-4 text-xs text-[var(--color-app-muted)]">
            Only allow-listed Discord accounts can sign in.
          </p>
        )}
        <p className="mt-6 text-[11px] text-[var(--color-app-muted)]/60">Built by Offxc</p>
      </div>
    </main>
  );
}
