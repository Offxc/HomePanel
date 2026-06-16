import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// Single insert path shared by the Settings action and the inline /api/tags route.
// Tag.name is unique — if the name already exists we return the existing row
// rather than throwing a raw P2002 at the caller.
export async function createTag(name: string, colorKey: string) {
  try {
    const max = await db.tag.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
    return await db.tag.create({
      data: { name, colorKey, order: (max?.order ?? 0) + 1 },
      select: { id: true, name: true, colorKey: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await db.tag.findUnique({
        where: { name },
        select: { id: true, name: true, colorKey: true },
      });
      if (existing) return existing;
    }
    throw e;
  }
}
