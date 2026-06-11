"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { href: string; label: string; icon: string };

export function NavTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 p-1 rounded-xl bg-[var(--color-app-bg)] border mb-3">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[13px] font-medium transition-all ${
              active
                ? "bg-[var(--color-app-surface)] text-[var(--color-app-text)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                : "text-[var(--color-app-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-surface)]/40"
            }`}
          >
            <span aria-hidden className={active ? "" : "opacity-70"}>{t.icon}</span>
            <span>{t.label}</span>
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-3 -bottom-px h-[2px] rounded-full"
                style={{ background: `linear-gradient(90deg, var(--color-accent), var(--c-pink-dot))` }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
