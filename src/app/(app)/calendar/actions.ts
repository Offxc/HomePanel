"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { isRecurFreq } from "@/lib/recur";

const AddSchema = z.object({
  title: z.string().trim().min(1).max(200),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  startsAt: z.string().trim().min(1).max(40),
  endsAt: z.string().trim().max(40).optional().or(z.literal("")),
  allDay: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).default(false),
  assigneeId: z.string().trim().max(40).optional().or(z.literal("")),
  recurFreq: z.string().trim().max(20).optional().or(z.literal("")),
  recurInterval: z.coerce.number().int().min(1).max(366).optional().default(1),
  recurUntil: z.string().trim().max(40).optional().or(z.literal("")),
  tagIds: z.string().trim().max(1000).optional().or(z.literal("")),
});

const IdSchema = z.object({ id: z.string().min(1).max(50) });

function ensureRate(actorId: string) {
  const r = rateLimit(`cal:${actorId}`, { capacity: 30, refillPerSec: 1 });
  if (!r.ok) {
    void audit("ratelimit.hit", { actorId, detail: "cal" });
    throw new Error("Too many requests");
  }
}

async function resolveAssignee(rawId: string | undefined | null): Promise<string | null> {
  if (!rawId) return null;
  const exists = await db.user.findUnique({ where: { id: rawId }, select: { id: true } });
  return exists?.id ?? null;
}

function parseTagIds(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
}

export async function addEvent(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const parsed = AddSchema.parse({
    title: formData.get("title"),
    location: formData.get("location") ?? "",
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") ?? "",
    allDay: formData.get("allDay") ?? false,
    assigneeId: formData.get("assigneeId") ?? "",
    recurFreq: formData.get("recurFreq") ?? "",
    recurInterval: formData.get("recurInterval") ?? 1,
    recurUntil: formData.get("recurUntil") ?? "",
    tagIds: formData.get("tagIds") ?? "",
  });
  const starts = new Date(parsed.startsAt);
  const ends = parsed.endsAt ? new Date(parsed.endsAt) : null;
  if (Number.isNaN(starts.getTime())) throw new Error("invalid start date");
  if (ends && Number.isNaN(ends.getTime())) throw new Error("invalid end date");

  const assigneeId = await resolveAssignee(parsed.assigneeId);
  const recurFreq = isRecurFreq(parsed.recurFreq) ? parsed.recurFreq : null;
  const recurUntil = parsed.recurUntil ? new Date(parsed.recurUntil) : null;

  const tagIds = parseTagIds(parsed.tagIds);

  const event = await db.event.create({
    data: {
      title: parsed.title,
      location: parsed.location || null,
      startsAt: starts,
      endsAt: ends,
      allDay: parsed.allDay,
      assigneeId,
      recurFreq,
      recurInterval: parsed.recurInterval,
      recurUntil: recurUntil && !Number.isNaN(recurUntil.getTime()) ? recurUntil : null,
      createdById: user.id,
    },
  });

  if (tagIds.length > 0) {
    const validTags = await db.tag.findMany({ where: { id: { in: tagIds } }, select: { id: true } });
    if (validTags.length > 0) {
      await db.eventTag.createMany({
        data: validTags.map((t) => ({ eventId: event.id, tagId: t.id })),
      });
    }
  }
  revalidatePath("/calendar");
}

export async function editEvent(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const id = z.string().min(1).max(50).parse(formData.get("id"));
  const _y = formData.get("_y") as string;
  const _m = formData.get("_m") as string;
  const _d = formData.get("_d") as string;

  const parsed = AddSchema.parse({
    title: formData.get("title"),
    location: formData.get("location") ?? "",
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") ?? "",
    allDay: formData.get("allDay") ?? false,
    assigneeId: formData.get("assigneeId") ?? "",
    recurFreq: formData.get("recurFreq") ?? "",
    recurInterval: formData.get("recurInterval") ?? 1,
    recurUntil: formData.get("recurUntil") ?? "",
    tagIds: formData.get("tagIds") ?? "",
  });

  const starts = new Date(parsed.startsAt);
  const ends = parsed.endsAt ? new Date(parsed.endsAt) : null;
  if (Number.isNaN(starts.getTime())) throw new Error("invalid start date");
  if (ends && Number.isNaN(ends.getTime())) throw new Error("invalid end date");

  const assigneeId = await resolveAssignee(parsed.assigneeId);
  const recurFreq = isRecurFreq(parsed.recurFreq) ? parsed.recurFreq : null;
  const recurUntil = parsed.recurUntil ? new Date(parsed.recurUntil) : null;
  const tagIds = parseTagIds(parsed.tagIds);

  await db.event.update({
    where: { id },
    data: {
      title: parsed.title,
      location: parsed.location || null,
      startsAt: starts,
      endsAt: ends,
      allDay: parsed.allDay,
      assigneeId,
      recurFreq,
      recurInterval: parsed.recurInterval,
      recurUntil: recurUntil && !Number.isNaN(recurUntil.getTime()) ? recurUntil : null,
    },
  });

  await db.eventTag.deleteMany({ where: { eventId: id } });
  if (tagIds.length > 0) {
    const validTags = await db.tag.findMany({ where: { id: { in: tagIds } }, select: { id: true } });
    if (validTags.length > 0) {
      await db.eventTag.createMany({
        data: validTags.map((t) => ({ eventId: id, tagId: t.id })),
      });
    }
  }

  revalidatePath("/calendar");
  redirect(`/calendar?y=${_y}&m=${_m}&d=${_d}`);
}

export async function deleteEvent(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await db.event.delete({ where: { id } });
  await audit("event.delete", { actorId: user.id, detail: `id=${id}` });
  revalidatePath("/calendar");
}
