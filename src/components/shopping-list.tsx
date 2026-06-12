"use client";

import { useOptimistic, useRef } from "react";
import { ShopRow } from "@/components/shop-row";
import { AssigneeRadio } from "@/components/assignee-radio";
import { addShopItem } from "@/app/(app)/shopping/actions";
import type { HouseholdMember } from "@/lib/household";

export type ShopItem = {
  id: string;
  name: string;
  qty: string | null;
  done: boolean;
  ownerName: string;
  ownerColorKey: string;
};

export function ShoppingList({
  initialItems,
  members,
  userId,
}: {
  initialItems: ShopItem[];
  members: HouseholdMember[];
  userId: string;
}) {
  const [items, addOptimistic] = useOptimistic(
    initialItems,
    (state: ShopItem[], item: ShopItem) => [item, ...state],
  );

  const formRef = useRef<HTMLFormElement>(null);

  async function handleAdd(formData: FormData) {
    const name = formData.get("name") as string;
    const qty = (formData.get("qty") as string)?.trim() || null;
    const assigneeId = (formData.get("assigneeId") as string) || "";
    const assignee = assigneeId ? (members.find((m) => m.id === assigneeId) ?? null) : null;

    addOptimistic({
      id: `__opt_${Date.now()}`,
      name: name.trim(),
      qty,
      done: false,
      ownerName: assignee?.displayName ?? "Both",
      ownerColorKey: assignee?.colorKey ?? "gray",
    });

    formRef.current?.reset();
    await addShopItem(formData);
  }

  return (
    <>
      {items.map((i) => (
        <ShopRow
          key={i.id}
          id={i.id}
          name={i.name}
          qty={i.qty}
          done={i.done}
          ownerName={i.ownerName}
          ownerColorKey={i.ownerColorKey}
        />
      ))}
      {items.length === 0 && (
        <p className="text-sm text-[var(--color-app-muted)] py-6 text-center">
          Nothing on the list yet.
        </p>
      )}
      <form ref={formRef} action={handleAdd} className="mt-4 flex flex-wrap gap-2 items-center">
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
        <AssigneeRadio name="assigneeId" members={members} defaultValue={userId} />
        <button type="submit" className="btn-accent text-sm px-3 py-2 rounded-md font-medium">
          Add
        </button>
      </form>
    </>
  );
}
