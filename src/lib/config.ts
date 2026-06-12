import { db } from "@/lib/db";

export type HouseholdConfig = {
  weatherCity: string;
  weatherLat: number;
  weatherLng: number;
  countryCode: string;
  timezone: string;
};

const DEFAULTS: HouseholdConfig = {
  weatherCity: "Ottawa",
  weatherLat: 45.4215,
  weatherLng: -75.6972,
  countryCode: "CA",
  timezone: "America/Toronto",
};

export async function getHouseholdConfig(): Promise<HouseholdConfig> {
  try {
    const row = await db.householdConfig.findUnique({ where: { id: "default" } });
    return row ?? DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}
