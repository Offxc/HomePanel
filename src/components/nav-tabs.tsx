"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS, type NavIconName } from "@/components/icons";

export type Tab = { href: string; label: string; icon: NavIconName };

export function NavTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 p-1 rounded-xl bg-[var(--color-app-bg)] border mb-3">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        const Icon = NAV_ICONS[t.icon];
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[13px] font-medium transition-all ${
              active
                ? "bg-[var(--color-app-surface)] text-[var(--color-app-text)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                : "text-[var(--color-app-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-surface)]/40"
            }`}
          >
            <Icon className={`w-[18px] h-[18px] sm:w-4 sm:h-4 ${active ? "" : "opacity-70"}`} />
            <span className="leading-none">{t.label}</span>
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
