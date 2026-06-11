import { clsx } from "clsx";

export function Card({
  className,
  children,
  hover = false,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={clsx(
        "rounded-xl border bg-[var(--color-app-surface)] p-4",
        hover && "lift",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children, count }: { children: React.ReactNode; count?: React.ReactNode }) {
  return (
    <h2 className="flex items-center justify-between text-[13px] font-medium text-[var(--color-app-muted)] mb-2.5">
      <span className="inline-flex items-center gap-1.5">{children}</span>
      {count != null && <span className="text-xs text-[var(--color-app-muted)]/70">{count}</span>}
    </h2>
  );
}
