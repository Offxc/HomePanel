import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getHousehold } from "@/lib/household";
import { coerceColorKey } from "@/lib/colors";
import { Card, CardTitle } from "@/components/card";
import { ShoppingList } from "@/components/shopping-list";
import { clearDone } from "./actions";

export default async function ShoppingPage() {
  const user = await requireSession();
  const [items, members] = await Promise.all([
    db.shoppingItem.findMany({
      orderBy: [{ done: "asc" }, { createdAt: "desc" }],
      include: {
        assignee: { select: { id: true, colorKey: true, displayName: true, name: true, discordId: true } },
      },
    }),
    getHousehold(),
  ]);
  const memberById = new Map(members.map((m) => [m.id, m]));

  const total = items.length;
  const done = items.filter((i) => i.done).length;

  const shopItems = items.map((i) => {
    const assignee = i.assigneeId ? memberById.get(i.assigneeId) : null;
    return {
      id: i.id,
      name: i.name,
      qty: i.qty ?? null,
      done: i.done,
      ownerName: assignee ? assignee.displayName : "Both",
      ownerColorKey: assignee ? assignee.colorKey : coerceColorKey("gray", "gray"),
    };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-3 fade-in">
      <Card hover>
        <CardTitle count={`${total} items · ${done} done`}>Shopping list</CardTitle>
        <p className="text-[11px] text-[var(--color-app-muted)] mb-1.5">Tap a row to cross it off.</p>
        <ShoppingList initialItems={shopItems} members={members} userId={user.id} />
        {done > 0 && (
          <form action={clearDone} className="mt-3">
            <button
              type="submit"
              className="text-xs text-[var(--color-app-muted)] hover:text-[var(--color-app-text)] underline underline-offset-2"
            >
              Clear {done} crossed-off
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
