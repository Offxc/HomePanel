import { signOut } from "@/auth";
import { getHousehold } from "@/lib/household";
import { getWeather } from "@/lib/weather";
import { getHouseholdConfig } from "@/lib/config";
import { formatLong } from "@/lib/dates";
import { OwnerPill } from "@/components/owner-pill";
import { WeatherWidget } from "@/components/weather-widget";

async function doSignOut() {
  "use server";
  await signOut({ redirectTo: "/signin" });
}

export async function AppHeader() {
  const [members, config] = await Promise.all([getHousehold(), getHouseholdConfig()]);
  const weather = await getWeather(config.weatherLat, config.weatherLng);

  const today = formatLong(new Date());

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-[var(--color-app-surface)] mb-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 font-medium text-[15px] flex-shrink-0">
          <span aria-hidden className="brand-mark text-base">▦</span>
          <span className="brand-mark">HomePanel</span>
        </div>
        <div className="flex items-center gap-2 border-l pl-3 ml-1 min-w-0">
          <span className="font-semibold text-[var(--color-app-text)] truncate text-sm">{today}</span>
          <WeatherWidget initial={weather} city={config.weatherCity} />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {members.map((m) => (
          <OwnerPill key={m.id} name={m.displayName} colorKey={m.colorKey} />
        ))}
        <form action={doSignOut}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="ml-1 w-7 h-7 inline-flex items-center justify-center rounded-md border text-[var(--color-app-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-bg)] transition-colors"
          >
            ⎋
          </button>
        </form>
      </div>
    </header>
  );
}
