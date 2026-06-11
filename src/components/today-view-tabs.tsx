import Link from "next/link";
import type { HouseholdMember } from "@/lib/household";

// Combined / Off / Bri view selector. Server-rendered Links; the URL drives state.
export function TodayViewTabs({
  current,
  members,
}: {
  current: string;
  members: HouseholdMember[];
}) {
  const opts: { value: string; label: string; colorKey: string }[] = [
    { value: "combined", label: "Combined", colorKey: "gray" },
    ...members.map((m) => ({ value: m.displayName.toLowerCase(), label: m.displayName, colorKey: m.colorKey })),
  ];
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full border bg-[var(--color-app-bg)]">
      {opts.map((o) => {
        const active = current === o.value;
        return (
          <Link
            key={o.value}
            href={`/today?view=${o.value}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              active
                ? "bg-[var(--color-app-surface)] text-[var(--color-app-text)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                : "text-[var(--color-app-muted)] hover:text-[var(--color-app-text)]"
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: `var(--c-${o.colorKey}-dot)` }}
              aria-hidden
            />
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
