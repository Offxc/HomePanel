"use client";

import { useState, useTransition } from "react";
import { deleteCard, editCard, moveCard } from "@/app/(app)/kanban/actions";

export type KanbanCardData = {
  id: string;
  title: string;
};

export function KanbanCard({
  card,
  prevColumnId,
  nextColumnId,
}: {
  card: KanbanCardData;
  prevColumnId: string | null;
  nextColumnId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [pending, start] = useTransition();

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (trimmed === card.title) {
      setEditing(false);
      return;
    }
    const fd = new FormData();
    fd.append("id", card.id);
    fd.append("title", trimmed);
    start(async () => {
      await editCard(fd);
      setEditing(false);
    });
  };

  const remove = () => {
    if (!confirm("Delete this card?")) return;
    const fd = new FormData();
    fd.append("id", card.id);
    start(() => {
      void deleteCard(fd);
    });
  };

  const move = (toColumnId: string) => {
    const fd = new FormData();
    fd.append("id", card.id);
    fd.append("toColumnId", toColumnId);
    start(() => {
      void moveCard(fd);
    });
  };

  return (
    <article
      className={`group rounded-lg border bg-[var(--color-app-surface)] p-2.5 transition-all lift ${
        pending ? "opacity-60" : ""
      }`}
    >
      {editing ? (
        <>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") {
                setTitle(card.title);
                setEditing(false);
              }
            }}
            rows={2}
            maxLength={300}
            autoFocus
            className="w-full text-sm bg-transparent resize-none focus:outline-none"
          />
          <div className="flex justify-end gap-1 mt-1.5">
            <button
              type="button"
              onClick={() => {
                setTitle(card.title);
                setEditing(false);
              }}
              className="text-[11px] px-1.5 py-0.5 text-[var(--color-app-muted)] hover:text-[var(--color-app-text)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="btn-accent text-[11px] px-2 py-0.5 rounded font-medium"
            >
              Save
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            onClick={() => setEditing(true)}
            className="text-sm leading-snug whitespace-pre-wrap cursor-text"
          >
            {card.title}
          </div>
          <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <div className="flex gap-0.5">
              {prevColumnId && (
                <button
                  type="button"
                  onClick={() => move(prevColumnId)}
                  aria-label="Move left"
                  title="Move left"
                  className="w-6 h-6 inline-flex items-center justify-center rounded text-[var(--color-app-muted)] hover:bg-[var(--color-app-bg)] hover:text-[var(--color-app-text)]"
                >
                  ←
                </button>
              )}
              {nextColumnId && (
                <button
                  type="button"
                  onClick={() => move(nextColumnId)}
                  aria-label="Move right"
                  title="Move right"
                  className="w-6 h-6 inline-flex items-center justify-center rounded text-[var(--color-app-muted)] hover:bg-[var(--color-app-bg)] hover:text-[var(--color-app-text)]"
                >
                  →
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={remove}
              aria-label="Delete card"
              title="Delete"
              className="w-6 h-6 inline-flex items-center justify-center rounded text-[var(--color-app-muted)] hover:bg-[var(--color-app-bg)] hover:text-red-600"
            >
              ×
            </button>
          </div>
        </>
      )}
    </article>
  );
}
