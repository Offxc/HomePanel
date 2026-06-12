"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const AddSchema = z.object({
  name: z.string().trim().min(1).max(100),
  qty: z.string().trim().max(40).optional().or(z.literal("")),
  assigneeId: z.string().max(50).transform((v) => v === "" ? null : v).nullable().default(null),
});

const IdSchema = z.object({ id: z.string().min(1).max(50) });

function ensureRate(actorId: string) {
  const r = rateLimit(`shop:${actorId}`, { capacity: 60, refillPerSec: 2 });
  if (!r.ok) {
    void audit("ratelimit.hit", { actorId, detail: "shop" });
    throw new Error("Too many requests");
  }
}

export async function addShopItem(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const parsed = AddSchema.parse({
    name: formData.get("name"),
    qty: formData.get("qty") ?? "",
    assigneeId: formData.get("assigneeId") ?? "",
  });
  await db.shoppingItem.create({
    data: {
      name: parsed.name,
      qty: parsed.qty || null,
      assigneeId: parsed.assigneeId,
      createdById: user.id,
    },
  });
  revalidatePath("/shopping");
}

export async function toggleShopItem(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const { id } = IdSchema.parse({ id: formData.get("id") });
  const existing = await db.shoppingItem.findUnique({ where: { id }, select: { done: true } });
  if (!existing) return;
  await db.shoppingItem.update({
    where: { id },
    data: existing.done
      ? { done: false, doneAt: null, doneById: null }
      : { done: true, doneAt: new Date(), doneById: user.id },
  });
  revalidatePath("/shopping");
}

export async function deleteShopItem(formData: FormData) {
  const user = await requireSession();
  ensureRate(user.id);
  const { id } = IdSchema.parse({ id: formData.get("id") });
  await db.shoppingItem.delete({ where: { id } });
  await audit("shop.delete", { actorId: user.id, detail: `id=${id}` });
  revalidatePath("/shopping");
}

export async function clearDone() {
  const user = await requireSession();
  ensureRate(user.id);
  const result = await db.shoppingItem.deleteMany({ where: { done: true } });
  await audit("shop.delete", { actorId: user.id, detail: `clearDone count=${result.count}` });
  revalidatePath("/shopping");
}
