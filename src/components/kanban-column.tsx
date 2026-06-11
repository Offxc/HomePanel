"use client";

import { useState, useTransition } from "react";
import { addCard, deleteColumn, recolorColumn, renameColumn } from "@/app/(app)/kanban/actions";
import { COLOR_KEYS, COLOR_LABELS } from "@/lib/colors";
import { KanbanCard, type KanbanCardData } from "@/components/kanban-card";

export type KanbanColumnData = {
  id: string;
  name: string;
  colorKey: string;
};

export function KanbanColumn({
  column,
  cards,
  prevColumnId,
  nextColumnId,
}: {
  column: KanbanColumnData;
  cards: KanbanCardData[];
  prevColumnId: string | null;
  nextColumnId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newCard, setNewCard] = useState("");
  const [pending, start] = useTransition();

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(column.name);
      setEditing(false);
      return;
    }
    if (trimmed === column.name) {
      setEditing(false);
      return;
    }
    const fd = new FormData();
    fd.append("id", column.id);
    fd.append("name", trimmed);
    start(async () => {
      await renameColumn(fd);
      setEditing(false);
    });
  };

  const pickColor = (colorKey: string) => {
    const fd = new FormData();
    fd.append("id", column.id);
    fd.append("colorKey", colorKey);
    start(async () => {
      await recolorColumn(fd);
      setPickerOpen(false);
    });
  };

  const remove = () => {
    const msg =
      cards.length > 0
        ? `Delete this column? ${cards.length} card${cards.length === 1 ? "" : "s"} will be removed too.`
        : "Delete this column?";
    if (!confirm(msg)) return;
    const fd = new FormData();
    fd.append("id", column.id);
    start(() => {
      void deleteColumn(fd);
    });
  };

  const submitNewCard = () => {
    const trimmed = newCard.trim();
    if (!trimmed) return;
    const fd = new FormData();
    fd.append("columnId", column.id);
    fd.append("title", trimmed);
    start(async () => {
      await addCard(fd);
      setNewCard("");
    });
  };

  return (
    <section
      className={`flex flex-col min-w-[260px] w-[260px] flex-shrink-0 rounded-lg border bg-[var(--color-app-bg)] p-2.5 ${
        pending ? "opacity-70" : ""
      }`}
      style={{ borderTop: `2px solid var(--c-${column.colorKey}-dot)` }}
    >
      <div className="flex items-center gap-2 mb-3 group/header">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-label="Change column colour"
          title="Change colour"
          className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-[var(--color-app-border)] hover:ring-[var(--color-app-text)] transition-shadow"
          style={{ background: `var(--c-${column.colorKey}-dot)` }}
        />
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setName(column.name);
                setEditing(false);
              }
            }}
            maxLength={40}
            autoFocus
            className="flex-1 bg-transparent text-xs font-semibold uppercase tracking-wider focus:outline-none border-b border-dashed border-[var(--color-app-border-strong)] px-0.5"
            style={{ color: `var(--c-${column.colorKey}-text)` }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Click to rename"
            className="flex-1 text-left text-xs font-semibold uppercase tracking-wider cursor-text hover:opacity-70 transition-opacity"
            style={{ color: `var(--c-${column.colorKey}-text)` }}
          >
            {column.name}
          </button>
        )}
        <span className="text-[10px] text-[var(--color-app-muted)] tabular-nums">{cards.length}</span>
        <button
          type="button"
          onClick={remove}
          aria-label="Delete column"
          title="Delete column"
          className="w-5 h-5 inline-flex items-center justify-center rounded text-[var(--color-app-muted)] hover:bg-[var(--color-app-surface)] hover:text-red-600 opacity-0 group-hover/header:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>

      {pickerOpen && (
        <div className="grid grid-cols-4 gap-1.5 mb-3 p-2 rounded-md border bg-[var(--color-app-surface)] shimmer-in">
          {COLOR_KEYS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pickColor(c)}
              aria-label={COLOR_LABELS[c]}
              title={COLOR_LABELS[c]}
              className="h-6 rounded border-2 transition-all hover:scale-110"
              style={{
                background: `var(--c-${c}-dot)`,
                borderColor: c === column.colorKey ? "var(--color-app-text)" : "transparent",
              }}
            />
          ))}
        </div>
      )}

      <div className="space-y-1.5 flex-1 min-h-[40px]">
        {cards.map((c) => (
          <KanbanCard key={c.id} card={c} prevColumnId={prevColumnId} nextColumnId={nextColumnId} />
        ))}
        {cards.length === 0 && (
          <p className="text-[11px] text-[var(--color-app-muted)] italic py-2 px-1">No cards yet.</p>
        )}
      </div>

      <div className="mt-2 pt-2 border-t">
        <textarea
          value={newCard}
          onChange={(e) => setNewCard(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submitNewCard();
            }
          }}
          rows={2}
          placeholder="+ Add a card…"
          maxLength={300}
          className="w-full text-xs bg-transparent resize-none focus:outline-none placeholder:text-[var(--color-app-muted)] py-1"
        />
        {newCard.trim() && (
          <button
            type="button"
            onClick={submitNewCard}
            className="btn-accent w-full text-xs px-2 py-1 rounded font-medium mt-1"
          >
            Add card
          </button>
        )}
      </div>
    </section>
  );
}
