// Open-Meteo current weather for Ottawa. No API key, 15-min server-side cache.

export type Weather = {
  tempC: number;
  code: number;
  label: string;
  icon: string;
};

const TTL_MS = 15 * 60 * 1000;
let cache: { at: number; weather: Weather | null } = { at: 0, weather: null };

const CODE_MAP: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear", icon: "☀" },
  1: { label: "Mostly clear", icon: "🌤" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁" },
  45: { label: "Fog", icon: "🌫" },
  48: { label: "Fog", icon: "🌫" },
  51: { label: "Light drizzle", icon: "🌦" },
  53: { label: "Drizzle", icon: "🌦" },
  55: { label: "Heavy drizzle", icon: "🌧" },
  61: { label: "Light rain", icon: "🌦" },
  63: { label: "Rain", icon: "🌧" },
  65: { label: "Heavy rain", icon: "🌧" },
  71: { label: "Light snow", icon: "🌨" },
  73: { label: "Snow", icon: "🌨" },
  75: { label: "Heavy snow", icon: "❄" },
  77: { label: "Snow grains", icon: "🌨" },
  80: { label: "Showers", icon: "🌦" },
  81: { label: "Showers", icon: "🌧" },
  82: { label: "Heavy showers", icon: "🌧" },
  85: { label: "Snow showers", icon: "🌨" },
  86: { label: "Heavy snow showers", icon: "❄" },
  95: { label: "Thunderstorm", icon: "⛈" },
  96: { label: "Thunderstorm + hail", icon: "⛈" },
  99: { label: "Severe thunderstorm", icon: "⛈" },
};

export async function getOttawaWeather(): Promise<Weather | null> {
  const now = Date.now();
  if (cache.weather && now - cache.at < TTL_MS) return cache.weather;
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=45.4215&longitude=-75.6972&current=temperature_2m,weather_code&timezone=America%2FToronto";
    const r = await fetch(url, { next: { revalidate: 900 } });
    if (!r.ok) throw new Error(`weather ${r.status}`);
    const j = (await r.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    const tempC = Math.round(j.current?.temperature_2m ?? NaN);
    const code = j.current?.weather_code ?? 0;
    if (!Number.isFinite(tempC)) throw new Error("bad data");
    const meta = CODE_MAP[code] ?? { label: "Unknown", icon: "·" };
    const weather: Weather = { tempC, code, ...meta };
    cache = { at: now, weather };
    return weather;
  } catch {
    return null;
  }
}
