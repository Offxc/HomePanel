"use client";

import { useEffect, useState } from "react";

type Weather = { tempC: number; label: string; icon: string };

const REFRESH_MS = 3 * 60 * 1000;

export function WeatherWidget({
  initial,
  city,
  timezone,
}: {
  initial: Weather | null;
  city: string;
  timezone: string;
}) {
  const [weather, setWeather] = useState<Weather | null>(initial);
  const [tz, setTz] = useState(timezone);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/weather");
        if (r.ok) {
          const data = await r.json();
          if (data.weather) setWeather(data.weather);
          if (data.timezone) setTz(data.timezone);
        }
      } catch {}
    }
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  if (!weather) return null;

  return (
    <span className="inline-flex items-center gap-1 flex-shrink-0 text-xs text-[var(--color-app-muted)]">
      <span aria-hidden>·</span>
      <span aria-hidden className="text-base leading-none">{weather.icon}</span>
      <span className="tabular-nums font-medium text-[var(--color-app-text)]">{weather.tempC}°C</span>
      <span className="hidden sm:inline">{weather.label}</span>
      <span className="hidden md:inline text-[var(--color-app-muted)]/70">· {city}</span>
    </span>
  );
}
