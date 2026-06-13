"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  async function handleClick() {
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (!isAndroid) {
      await signIn("discord", { callbackUrl: "/today" });
      return;
    }

    // On Android: get the OAuth URL from Auth.js, then open it in the system
    // browser via an intent URL so saved credentials / session are available.
    // The Discord callback to home.offlabs.cc is intercepted by Android App Links
    // and handed back to this TWA to complete the sign-in.
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();

      const res = await fetch("/api/auth/signin/discord", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, callbackUrl: "/today", json: "true" }),
      });
      const { url } = (await res.json()) as { url?: string };

      if (!url) throw new Error("no url");

      // Strip the https:// prefix for the intent:// scheme
      const intentUrl =
        "intent://" +
        url.replace(/^https?:\/\//, "") +
        "#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end";

      window.location.href = intentUrl;
    } catch {
      // Fallback to standard redirect if intent fetch fails
      await signIn("discord", { callbackUrl: "/today" });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
      style={{ background: "#5865F2" }}
    >
      <span aria-hidden>◆</span>
      Continue with Discord
    </button>
  );
}
