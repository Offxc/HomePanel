"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { COLOR_KEYS } from "@/lib/colors";
import { invalidateWeatherCache } from "@/lib/weather";

const ProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(30),
  colorKey: z.enum(COLOR_KEYS),
  kanbanEnabled: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).default(false),
});

const TagAddSchema = z.object({
  name: z.string().trim().min(1).max(30),
  colorKey: z.enum(COLOR_KEYS),
});

const TagUpdateSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().trim().min(1).max(30),
  colorKey: z.enum(COLOR_KEYS),
});

const IdSchema = z.object({ id: z.string().min(1).max(50) });

const LocationSchema = z.object({
  weatherCity: z.string().trim().min(1).max(100),
  weatherLat: z.coerce.number().min(-90).max(90),
  weatherLng: z.coerce.number().min(-180).max(180),
  countryCode: z.string().trim().length(2).transform((s) => s.toUpperCase()).refine((s) => /^[A-Z]{2}$/.test(s)),
  timezone: z.string().trim().min(1).max(60),
});

function ensureRate(actorId: string) {
  const r = rateLimit(`settings:${actorId}`, { capacity: 30, refillPerSec: 1 });
  if (!r.ok) {
    void audit("ratelimit.hit", { actorId, detail: "settings" });
    throw new Error("Too many requests");
  }
}

export async function updateProfile(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const parsed = ProfileSchema.parse({
    displayName: formData.get("displayName"),
    colorKey: formData.get("colorKey"),
    kanbanEnabled: formData.get("kanbanEnabled") ?? false,
  });
  await db.user.update({
    where: { id: user.id },
    data: {
      displayName: parsed.displayName,
      colorKey: parsed.colorKey,
      kanbanEnabled: parsed.kanbanEnabled,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function updateLocation(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const parsed = LocationSchema.parse({
    weatherCity: formData.get("weatherCity"),
    weatherLat: formData.get("weatherLat"),
    weatherLng: formData.get("weatherLng"),
    countryCode: formData.get("countryCode"),
    timezone: formData.get("timezone"),
  });
  // Invalidate old cached weather before saving new coords
  const existing = await db.householdConfig.findUnique({ where: { id: "default" } });
  if (existing) invalidateWeatherCache(existing.weatherLat, existing.weatherLng);
  await db.householdConfig.upsert({
    where: { id: "default" },
    create: { id: "default", ...parsed },
    update: parsed,
  });
  revalidatePath("/", "layout");
  revalidatePath("/calendar");
}

export async function addTag(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const parsed = TagAddSchema.parse({
    name: formData.get("name"),
    colorKey: formData.get("colorKey"),
  });
  await createTagRecord(user.id, parsed.name, parsed.colorKey);
  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/today");
}

export async function createTag(name: string, colorKey: string) {
  const user = await requireSession();
  ensureRate(user.id);
  const parsed = TagAddSchema.parse({ name, colorKey });
  const tag = await createTagRecord(user.id, parsed.name, parsed.colorKey);
  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/today");
  return tag;
}

async function createTagRecord(actorId: string, name: string, colorKey: string) {
  void actorId;
  const max = await db.tag.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  return db.tag.create({
    data: { name, colorKey, order: (max?.order ?? 0) + 1 },
    select: { id: true, name: true, colorKey: true },
  });
}

export async function updateTag(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const parsed = TagUpdateSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    colorKey: formData.get("colorKey"),
  });
  await db.tag.update({
    where: { id: parsed.id },
    data: { name: parsed.name, colorKey: parsed.colorKey },
  });
  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/today");
}

export async function deleteTag(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await db.tag.delete({ where: { id } });
  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/today");
}
