import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { z } from "zod";
import { COLOR_KEYS } from "@/lib/colors";
import { createTag } from "@/lib/tags";

const Schema = z.object({
  name: z.string().trim().min(1).max(30),
  colorKey: z.enum(COLOR_KEYS),
});

export async function POST(req: Request) {
  await requireSession();
  const parsed = Schema.parse(await req.json());
  const tag = await createTag(parsed.name, parsed.colorKey);
  return NextResponse.json(tag);
}
