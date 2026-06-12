export default function Loading() {
  return (
    <div className="space-y-3">
      <div className="h-10 w-48 rounded-lg bg-[var(--color-app-surface)] animate-pulse" />
      <div className="h-52 rounded-xl bg-[var(--color-app-surface)] animate-pulse" />
      <div className="h-36 rounded-xl bg-[var(--color-app-surface)] animate-pulse" />
      <div className="h-24 rounded-xl bg-[var(--color-app-surface)] animate-pulse" />
    </div>
  );
}
