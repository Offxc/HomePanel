"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { COLOR_KEYS } from "@/lib/colors";

const IdSchema = z.object({ id: z.string().min(1).max(50) });
const RenameSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().trim().min(1).max(40),
});
const RecolorSchema = z.object({
  id: z.string().min(1).max(50),
  colorKey: z.enum(COLOR_KEYS),
});
const AddCardSchema = z.object({
  columnId: z.string().min(1).max(50),
  title: z.string().trim().min(1).max(300),
});
const EditCardSchema = z.object({
  id: z.string().min(1).max(50),
  title: z.string().trim().min(1).max(300),
});
const MoveCardSchema = z.object({
  id: z.string().min(1).max(50),
  toColumnId: z.string().min(1).max(50),
});

function ensureRate(actorId: string) {
  const r = rateLimit(`kanban:${actorId}`, { capacity: 60, refillPerSec: 2 });
  if (!r.ok) {
    void audit("ratelimit.hit", { actorId, detail: "kanban" });
    throw new Error("Too many requests");
  }
}

export async function addColumn() {
  const u = await requireSession();
  ensureRate(u.id);
  const max = await db.kanbanColumn.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  await db.kanbanColumn.create({
    data: { name: "New column", colorKey: "gray", order: (max?.order ?? 0) + 1 },
  });
  revalidatePath("/kanban");
}

export async function renameColumn(formData: FormData) {
  const u = await requireSession();
  ensureRate(u.id);
  const { id, name } = RenameSchema.parse({ id: formData.get("id"), name: formData.get("name") });
  await db.kanbanColumn.update({ where: { id }, data: { name } });
  revalidatePath("/kanban");
}

export async function recolorColumn(formData: FormData) {
  const u = await requireSession();
  ensureRate(u.id);
  const { id, colorKey } = RecolorSchema.parse({
    id: formData.get("id"),
    colorKey: formData.get("colorKey"),
  });
  await db.kanbanColumn.update({ where: { id }, data: { colorKey } });
  revalidatePath("/kanban");
}

export async function deleteColumn(formData: FormData) {
  const u = await requireSession();
  ensureRate(u.id);
  const { id } = IdSchema.parse({ id: formData.get("id") });
  // Cascade removes cards via the schema FK rule.
  await db.kanbanColumn.delete({ where: { id } });
  await audit("note.delete", { actorId: u.id, detail: `kanban.column=${id}` });
  revalidatePath("/kanban");
}

export async function addCard(formData: FormData) {
  const u = await requireSession();
  ensureRate(u.id);
  const { columnId, title } = AddCardSchema.parse({
    columnId: formData.get("columnId"),
    title: formData.get("title"),
  });
  const max = await db.kanbanCard.findFirst({
    where: { columnId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await db.kanbanCard.create({
    data: { columnId, title, order: (max?.order ?? 0) + 1, createdById: u.id },
  });
  revalidatePath("/kanban");
}

export async function editCard(formData: FormData) {
  const u = await requireSession();
  ensureRate(u.id);
  const { id, title } = EditCardSchema.parse({
    id: formData.get("id"),
    title: formData.get("title"),
  });
  await db.kanbanCard.update({ where: { id }, data: { title } });
  revalidatePath("/kanban");
}

export async function deleteCard(formData: FormData) {
  const u = await requireSession();
  ensureRate(u.id);
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await db.kanbanCard.delete({ where: { id } });
  revalidatePath("/kanban");
}

export async function moveCard(formData: FormData) {
  const u = await requireSession();
  ensureRate(u.id);
  const { id, toColumnId } = MoveCardSchema.parse({
    id: formData.get("id"),
    toColumnId: formData.get("toColumnId"),
  });
  const max = await db.kanbanCard.findFirst({
    where: { columnId: toColumnId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await db.kanbanCard.update({
    where: { id },
    data: { columnId: toColumnId, order: (max?.order ?? 0) + 1 },
  });
  revalidatePath("/kanban");
}
