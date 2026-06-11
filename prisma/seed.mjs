// First-run seed. Creates baseline shared data (event tags, kanban columns).
// Does NOT create users — users are provisioned via Discord OAuth on first sign-in.
// Safe to run multiple times: each section is a no-op if data already exists.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const tagCount = await db.tag.count();
  if (tagCount === 0) {
    await db.tag.createMany({
      data: [
        { name: "Work", colorKey: "blue", order: 0 },
        { name: "Family", colorKey: "amber", order: 1 },
        { name: "Fitness", colorKey: "green", order: 2 },
        { name: "Social", colorKey: "purple", order: 3 },
        { name: "Errands", colorKey: "red", order: 4 },
      ],
    });
    console.log("Seeded 5 event tags.");
  }

  const colCount = await db.kanbanColumn.count();
  if (colCount === 0) {
    await db.kanbanColumn.createMany({
      data: [
        { name: "To do", colorKey: "gray", order: 0 },
        { name: "Doing", colorKey: "blue", order: 1 },
        { name: "Done", colorKey: "green", order: 2 },
      ],
    });
    console.log("Seeded 3 kanban columns.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
