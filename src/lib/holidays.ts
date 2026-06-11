// Canadian statutory + nationally observed holidays.
// All dates computed from the year — no hardcoded year tables.

export type Holiday = { date: Date; name: string; key: string };

// Meeus/Jones/Butcher Gregorian Easter algorithm.
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// nth occurrence of `dow` (0=Sun..6=Sat) in `month` (0-indexed) of `year`.
function nthDow(year: number, month: number, dow: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (dow - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

// Monday on or before the given date.
function mondayOnOrBefore(year: number, month: number, day: number): Date {
  const d = new Date(year, month, day);
  const dow = d.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  return new Date(year, month, day - back);
}

export function canadianHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const goodFriday = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2);
  return [
    { date: new Date(year, 0, 1), name: "New Year's Day", key: "nyd" },
    { date: goodFriday, name: "Good Friday", key: "gf" },
    { date: mondayOnOrBefore(year, 4, 24), name: "Victoria Day", key: "vd" },
    { date: new Date(year, 6, 1), name: "Canada Day", key: "cd" },
    { date: nthDow(year, 8, 1, 1), name: "Labour Day", key: "ld" },
    { date: new Date(year, 8, 30), name: "Truth & Reconciliation", key: "ndtr" },
    { date: nthDow(year, 9, 1, 2), name: "Thanksgiving", key: "tg" },
    { date: new Date(year, 10, 11), name: "Remembrance Day", key: "rd" },
    { date: new Date(year, 11, 25), name: "Christmas Day", key: "xd" },
    { date: new Date(year, 11, 26), name: "Boxing Day", key: "bd" },
  ];
}

// Index by `${year}-${month}-${day}` for fast lookup in the calendar grid.
export function indexHolidays(years: number[]): Map<string, Holiday[]> {
  const out = new Map<string, Holiday[]>();
  for (const y of years) {
    for (const h of canadianHolidays(y)) {
      const k = `${h.date.getFullYear()}-${h.date.getMonth()}-${h.date.getDate()}`;
      if (!out.has(k)) out.set(k, []);
      out.get(k)!.push(h);
    }
  }
  return out;
}
