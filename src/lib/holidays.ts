// Public holiday lookup via Nager.Date API (free, no auth).
// Falls back to hard-coded Canadian holidays if the API is unavailable.

export type Holiday = { date: Date; name: string; key: string };

// 24-hour in-memory cache keyed by "year-CC"
const holidayCache = new Map<string, { at: number; holidays: Holiday[] }>();
const HOLIDAY_TTL = 24 * 60 * 60 * 1000;

async function fetchFromNager(year: number, countryCode: string): Promise<Holiday[]> {
  const cacheKey = `${year}-${countryCode}`;
  const cached = holidayCache.get(cacheKey);
  if (cached && Date.now() - cached.at < HOLIDAY_TTL) return cached.holidays;

  try {
    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;
    const r = await fetch(url, { next: { revalidate: 86400 } });
    if (!r.ok) throw new Error(`nager ${r.status}`);
    const data = (await r.json()) as Array<{ date: string; name: string; localName: string }>;
    const holidays: Holiday[] = data.map((h, i) => ({
      date: new Date(h.date + "T00:00:00"),
      name: h.localName || h.name,
      key: `nager-${i}`,
    }));
    holidayCache.set(cacheKey, { at: Date.now(), holidays });
    return holidays;
  } catch {
    // Fall back to built-in Canadian data if the API fails
    if (countryCode === "CA") return canadianHolidays(year);
    return [];
  }
}

// Built-in Canadian holidays (offline fallback).

function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function nthDow(year: number, month: number, dow: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (dow - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function mondayOnOrBefore(year: number, month: number, day: number): Date {
  const d = new Date(year, month, day);
  const dow = d.getDay();
  return new Date(year, month, day - (dow === 0 ? 6 : dow - 1));
}

function canadianHolidays(year: number): Holiday[] {
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
export async function indexHolidays(
  years: number[],
  countryCode: string,
): Promise<Map<string, Holiday[]>> {
  const out = new Map<string, Holiday[]>();
  await Promise.all(
    years.map(async (y) => {
      const holidays = await fetchFromNager(y, countryCode);
      for (const h of holidays) {
        const k = `${h.date.getFullYear()}-${h.date.getMonth()}-${h.date.getDate()}`;
        if (!out.has(k)) out.set(k, []);
        out.get(k)!.push(h);
      }
    }),
  );
  return out;
}
