"use client";

import { useTransition } from "react";
import { OwnerPill } from "@/components/owner-pill";
import { deleteShopItem, toggleShopItem } from "@/app/(app)/shopping/actions";

export function ShopRow({
  id,
  name,
  qty,
  done,
  ownerName,
  ownerColorKey,
}: {
  id: string;
  name: string;
  qty: string | null;
  done: boolean;
  ownerName: string;
  ownerColorKey: string;
}) {
  const [pending, start] = useTransition();
  const toggle = () => {
    const fd = new FormData();
    fd.append("id", id);
    start(() => {
      void toggleShopItem(fd);
    });
  };
  const remove = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fd = new FormData();
    fd.append("id", id);
    start(() => {
      void deleteShopItem(fd);
    });
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          toggle();
        }
      }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer select-none border-t first:border-t-0 hover:bg-[var(--color-app-bg)] transition-colors ${
        pending ? "opacity-60" : ""
      }`}
      aria-pressed={done}
    >
      <span
        aria-hidden
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-white text-[12px] leading-none flex-shrink-0 transition-all ${
          done ? "border-[var(--color-app-text)] bg-[var(--color-app-text)] pop" : "border-[var(--color-app-border-strong)]"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <div className={`flex-1 min-w-0 ${done ? "line-through text-[var(--color-app-muted)]" : ""}`}>
        <span className="text-sm">{name}</span>
        {qty && <span className="text-xs text-[var(--color-app-muted)] ml-1.5">· {qty}</span>}
      </div>
      <OwnerPill name={ownerName} colorKey={ownerColorKey} />
      <button
        type="button"
        onClick={remove}
        aria-label="Remove"
        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-[var(--color-app-muted)] hover:bg-[var(--color-app-surface)] hover:text-red-600 transition-colors"
      >
        ×
      </button>
    </div>
  );
}
