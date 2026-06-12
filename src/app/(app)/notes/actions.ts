"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const AddSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(20_000),
  assigneeId: z.string().max(50).transform((v) => v === "" ? null : v).nullable().default(null),
});

const EditSchema = AddSchema.extend({ id: z.string().min(1).max(50) });

const IdSchema = z.object({ id: z.string().min(1).max(50) });

function ensureRate(actorId: string) {
  const r = rateLimit(`notes:${actorId}`, { capacity: 30, refillPerSec: 1 });
  if (!r.ok) {
    void audit("ratelimit.hit", { actorId, detail: "notes" });
    throw new Error("Too many requests");
  }
}

export async function addNote(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const parsed = AddSchema.parse({
    title: formData.get("title"),
    body: formData.get("body"),
    assigneeId: formData.get("assigneeId") ?? "",
  });
  await db.note.create({
    data: { title: parsed.title, body: parsed.body, assigneeId: parsed.assigneeId, authorId: user.id },
  });
  revalidatePath("/notes");
}

export async function editNote(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const parsed = EditSchema.parse({
    id: formData.get("id"),
    title: formData.get("title"),
    body: formData.get("body"),
    assigneeId: formData.get("assigneeId") ?? "",
  });
  await db.note.update({
    where: { id: parsed.id },
    data: { title: parsed.title, body: parsed.body, assigneeId: parsed.assigneeId },
  });
  revalidatePath("/notes");
  revalidatePath(`/notes/${parsed.id}`);
}

export async function deleteNote(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await db.note.delete({ where: { id } });
  await audit("note.delete", { actorId: user.id, detail: `id=${id}` });
  revalidatePath("/notes");
}
