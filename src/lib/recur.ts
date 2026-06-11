// Lightweight recurring-event expansion. Keeps DB rows to "base" events;
// instances are computed at query time.

export type RecurFreq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export const RECUR_FREQ_LABEL: Record<RecurFreq, string> = {
  DAILY: "Every day",
  WEEKLY: "Every week",
  MONTHLY: "Every month",
  YEARLY: "Every year",
};

export function isRecurFreq(v: unknown): v is RecurFreq {
  return typeof v === "string" && ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(v);
}

export function advance(date: Date, freq: RecurFreq, interval: number): Date {
  const d = new Date(date);
  switch (freq) {
    case "DAILY":
      d.setDate(d.getDate() + interval);
      return d;
    case "WEEKLY":
      d.setDate(d.getDate() + 7 * interval);
      return d;
    case "MONTHLY":
      d.setMonth(d.getMonth() + interval);
      return d;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + interval);
      return d;
  }
}

// Given a "base" event, return every instance that falls inside [rangeStart, rangeEnd].
// Hard-caps at 366 iterations as a safety belt against bad data.
export type Recurable = {
  startsAt: Date;
  recurFreq: string | null;
  recurInterval: number;
  recurUntil: Date | null;
};

export function expandRecurrence<T extends Recurable>(event: T, rangeStart: Date, rangeEnd: Date): Date[] {
  const dates: Date[] = [];
  if (!event.recurFreq) {
    if (event.startsAt >= rangeStart && event.startsAt <= rangeEnd) dates.push(event.startsAt);
    return dates;
  }
  if (!isRecurFreq(event.recurFreq)) return [event.startsAt];
  const interval = Math.max(1, event.recurInterval || 1);
  const hardStop = event.recurUntil ?? new Date(rangeEnd.getTime() + 366 * 86_400_000);
  let cursor = new Date(event.startsAt);
  let safety = 0;
  while (cursor <= rangeEnd && cursor <= hardStop && safety++ < 1000) {
    if (cursor >= rangeStart) dates.push(new Date(cursor));
    cursor = advance(cursor, event.recurFreq, interval);
  }
  return dates;
}
