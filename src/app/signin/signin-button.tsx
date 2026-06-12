"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn("discord", { callbackUrl: "/today" })}
      className="inline-flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
      style={{ background: "#5865F2" }}
    >
      <span aria-hidden>◆</span>
      Continue with Discord
    </button>
  );
}
