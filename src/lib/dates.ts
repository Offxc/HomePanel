// Pure date helpers. Everything in the user's local TZ (server clock).

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDayShort(d: Date): string {
  return d.toLocaleDateString([], { weekday: "short" });
}

export function formatLong(d: Date): string {
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}
