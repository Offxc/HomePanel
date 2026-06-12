import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getHouseholdConfig } from "@/lib/config";
import { getWeather } from "@/lib/weather";

export async function GET() {
  await requireSession();
  const config = await getHouseholdConfig();
  const weather = await getWeather(config.weatherLat, config.weatherLng);
  return NextResponse.json(weather);
}
