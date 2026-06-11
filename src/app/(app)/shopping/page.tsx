import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { displayNameFor } from "@/lib/allowlist";
import { getHousehold } from "@/lib/household";
import { coerceColorKey } from "@/lib/colors";
import { Card, CardTitle } from "@/components/card";
import { ShopRow } from "@/components/shop-row";
import { addShopItem, clearDone } from "./actions";

export default async function ShoppingPage() {
  await requireSession();
  const [items, members] = await Promise.all([
    db.shoppingItem.findMany({
      orderBy: [{ done: "asc" }, { createdAt: "desc" }],
      include: { createdBy: { select: { name: true, displayName: true, discordId: true, colorKey: true } } },
    }),
    getHousehold(),
  ]);
  const memberById = new Map(members.map((m) => [m.id, m]));

  const total = items.length;
  const done = items.filter((i) => i.done).length;

  function ownerLabel(creatorId: string, creator: { discordId: string | null; name: string | null; displayName: string | null; colorKey: string }) {
    const member = memberById.get(creatorId);
    return {
      name: member?.displayName ?? creator.displayName?.trim() ?? displayNameFor(creator.discordId, creator.name),
      colorKey: member?.colorKey ?? coerceColorKey(creator.colorKey, "gray"),
    };
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3 fade-in">
      <Card hover>
        <CardTitle count={`${total} items · ${done} done`}>Shopping list</CardTitle>
        <p className="text-[11px] text-[var(--color-app-muted)] mb-1.5">Tap a row to cross it off.</p>

        {items.map((i) => {
          const owner = ownerLabel(i.createdById, i.createdBy);
          return (
            <ShopRow
              key={i.id}
              id={i.id}
              name={i.name}
              qty={i.qty}
              done={i.done}
              ownerName={i.ownership === "BOTH" ? "Both" : owner.name}
              ownerColorKey={i.ownership === "BOTH" ? "gray" : owner.colorKey}
            />
          );
        })}
        {items.length === 0 && (
          <p className="text-sm text-[var(--color-app-muted)] py-6 text-center">Nothing on the list yet.</p>
        )}

        <form action={addShopItem} className="mt-4 flex flex-wrap gap-2 items-center">
          <input
            name="name"
            required
            maxLength={100}
            placeholder="Add item…"
            className="flex-1 min-w-[180px] rounded-md border px-3 py-2 text-sm bg-transparent"
          />
          <input
            name="qty"
            maxLength={40}
            placeholder="Qty"
            className="w-24 rounded-md border px-3 py-2 text-sm bg-transparent"
          />
          <select name="ownership" defaultValue="SHARED" className="rounded-md border px-2 py-2 text-sm bg-transparent">
            <option value="SHARED">Just me</option>
            <option value="BOTH">Both</option>
          </select>
          <button type="submit" className="btn-accent text-sm px-3 py-2 rounded-md font-medium">
            Add
          </button>
        </form>

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
