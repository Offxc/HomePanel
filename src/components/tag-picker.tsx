"use client";

import { useState } from "react";
import { TagPill } from "@/components/tag-pill";

export type TagOption = { id: string; name: string; colorKey: string };

// Posts a comma-separated tag-id list via a hidden input.
// "+ Tag" button opens a popover with available tags + a link to manage them.
export function TagPicker({
  name,
  available,
  defaultSelectedIds = [],
}: {
  name: string;
  available: TagOption[];
  defaultSelectedIds?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelectedIds);
  const [open, setOpen] = useState(false);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const selectedTags = available.filter((t) => selected.includes(t.id));

  return (
    <div className="relative inline-block">
      <input type="hidden" name={name} value={selected.join(",")} />
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        {selectedTags.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            aria-label={`Remove tag ${t.name}`}
            className="group focus:outline-none"
            title="Click to remove"
          >
            <TagPill name={t.name} colorKey={t.colorKey} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-[var(--color-app-border-strong)] text-[11px] text-[var(--color-app-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-bg)] transition-colors"
        >
          <span aria-hidden>+</span> Tag
        </button>
      </div>
      {open && (
        <div
          role="dialog"
          className="absolute z-20 mt-1 w-64 rounded-lg border bg-[var(--color-app-surface)] p-2 shadow-lg shimmer-in"
        >
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-app-muted)] font-medium px-1.5 mb-1.5">
            Tags
          </div>
          {available.length === 0 && (
            <p className="text-xs text-[var(--color-app-muted)] px-1.5 py-2">
              No tags yet — create one in Settings.
            </p>
          )}
          <ul className="space-y-0.5 max-h-48 overflow-y-auto">
            {available.map((t) => {
              const on = selected.includes(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => toggle(t.id)}
                    className="flex items-center justify-between gap-2 w-full text-left px-1.5 py-1 rounded-md hover:bg-[var(--color-app-bg)] transition-colors"
                  >
                    <TagPill name={t.name} colorKey={t.colorKey} />
                    <span className="text-xs text-[var(--color-app-muted)] w-4 text-center">
                      {on ? "✓" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 pt-2 border-t flex items-center justify-between">
            <a
              href="/settings#tags"
              className="text-xs text-[var(--color-accent)] hover:underline"
            >
              + Manage tags
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-[var(--color-app-muted)] hover:text-[var(--color-app-text)]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
