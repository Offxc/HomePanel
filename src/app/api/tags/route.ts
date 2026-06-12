import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";
import { COLOR_KEYS } from "@/lib/colors";

const Schema = z.object({
  name: z.string().trim().min(1).max(30),
  colorKey: z.enum(COLOR_KEYS),
});

export async function POST(req: Request) {
  await requireSession();
  const parsed = Schema.parse(await req.json());
  const max = await db.tag.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  const tag = await db.tag.create({
    data: { name: parsed.name, colorKey: parsed.colorKey, order: (max?.order ?? 0) + 1 },
    select: { id: true, name: true, colorKey: true },
  });
  return NextResponse.json(tag);
}
