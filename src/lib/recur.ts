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

// The Nth occurrence (n = 0 is the base event) computed *from the anchor*, not
// by stepping off the previous occurrence. Deriving day-of-month from the anchor
// is what makes "the 31st of every month" land on Feb 28 / Mar 31 correctly
// instead of drifting earlier each month.
export function nthOccurrence(anchor: Date, freq: RecurFreq, interval: number, n: number): Date {
  const d = new Date(anchor);
  switch (freq) {
    case "DAILY":
      d.setDate(d.getDate() + interval * n);
      return d;
    case "WEEKLY":
      d.setDate(d.getDate() + 7 * interval * n);
      return d;
    case "MONTHLY": {
      const day = anchor.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + interval * n);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));
      return d;
    }
    case "YEARLY": {
      const month = anchor.getMonth();
      const day = anchor.getDate();
      d.setFullYear(anchor.getFullYear() + interval * n, month, 1);
      const lastDay = new Date(d.getFullYear(), month + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));
      return d;
    }
  }
}

// Step one interval forward (kept for callers that want a single next date).
export function advance(date: Date, freq: RecurFreq, interval: number): Date {
  return nthOccurrence(date, freq, interval, 1);
}

// Given a "base" event, return every instance that falls inside [rangeStart, rangeEnd].
export type Recurable = {
  startsAt: Date;
  recurFreq: string | null;
  recurInterval: number;
  recurUntil: Date | null;
};

const DAY_MS = 86_400_000;

// Estimate the first occurrence index at/just before rangeStart so we don't iterate
// from the event's original start date — a daily event from years ago used to walk
// thousands of steps and silently fall off a safety cap before reaching the window.
function startIndex(anchor: Date, freq: RecurFreq, interval: number, rangeStart: Date): number {
  if (anchor >= rangeStart) return 0;
  let est: number;
  switch (freq) {
    case "DAILY":
      est = Math.floor((rangeStart.getTime() - anchor.getTime()) / (DAY_MS * interval));
      break;
    case "WEEKLY":
      est = Math.floor((rangeStart.getTime() - anchor.getTime()) / (7 * DAY_MS * interval));
      break;
    case "MONTHLY": {
      const months = (rangeStart.getFullYear() - anchor.getFullYear()) * 12 + (rangeStart.getMonth() - anchor.getMonth());
      est = Math.floor(months / interval);
      break;
    }
    case "YEARLY":
      est = Math.floor((rangeStart.getFullYear() - anchor.getFullYear()) / interval);
      break;
  }
  // Back off a couple of steps so a slightly-high estimate never skips a real instance.
  return Math.max(0, est - 2);
}

export function expandRecurrence<T extends Recurable>(event: T, rangeStart: Date, rangeEnd: Date): Date[] {
  const dates: Date[] = [];
  if (!event.recurFreq) {
    if (event.startsAt >= rangeStart && event.startsAt <= rangeEnd) dates.push(event.startsAt);
    return dates;
  }
  if (!isRecurFreq(event.recurFreq)) return [event.startsAt];

  const freq = event.recurFreq;
  const interval = Math.max(1, event.recurInterval || 1);
  const anchor = new Date(event.startsAt);
  const hardStop = event.recurUntil ?? null;

  let n = startIndex(anchor, freq, interval, rangeStart);
  // Safety belt is now bounded by the *window* size, not the event's age.
  let safety = 0;
  while (safety++ < 1500) {
    const occ = nthOccurrence(anchor, freq, interval, n);
    if (occ > rangeEnd) break;
    if (hardStop && occ > hardStop) break;
    if (occ >= rangeStart && occ >= anchor) dates.push(occ);
    n++;
  }
  return dates;
}
