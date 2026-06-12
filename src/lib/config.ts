import { cache } from "react";
import { db } from "@/lib/db";

export type HouseholdConfig = {
  weatherCity: string;
  weatherLat: number;
  weatherLng: number;
  countryCode: string;
  timezone: string;
  digestHour: number;
};

const DEFAULTS: HouseholdConfig = {
  weatherCity: "Ottawa",
  weatherLat: 45.4215,
  weatherLng: -75.6972,
  countryCode: "CA",
  timezone: "America/Toronto",
  digestHour: 6,
};

export const getHouseholdConfig = cache(async (): Promise<HouseholdConfig> => {
  try {
    const row = await db.householdConfig.findUnique({ where: { id: "default" } });
    return row ?? DEFAULTS;
  } catch {
    return DEFAULTS;
  }
});
