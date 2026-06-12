"use client";

import { useState } from "react";
import { TagPill } from "@/components/tag-pill";
import { COLOR_KEYS, COLOR_LABELS } from "@/lib/colors";
import { createTag } from "@/app/(app)/settings/actions";

export type TagOption = { id: string; name: string; colorKey: string };

export function TagPicker({
  name,
  available,
  defaultSelectedIds = [],
}: {
  name: string;
  available: TagOption[];
  defaultSelectedIds?: string[];
}) {
  const [tags, setTags] = useState<TagOption[]>(available);
  const [selected, setSelected] = useState<string[]>(defaultSelectedIds);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("purple");
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const selectedTags = tags.filter((t) => selected.includes(t.id));

  const createTag = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSaving(true);
    const tag = await createTag(trimmed, newColor);
    if (tag) {
      setTags((prev) => [...prev, tag]);
      setSelected((prev) => [...prev, tag.id]);
    }
    setNewName("");
    setNewColor("purple");
    setCreating(false);
    setSaving(false);
  };

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
          {tags.length === 0 && !creating && (
            <p className="text-xs text-[var(--color-app-muted)] px-1.5 py-2">No tags yet — create one below.</p>
          )}
          <ul className="space-y-0.5 max-h-40 overflow-y-auto">
            {tags.map((t) => {
              const on = selected.includes(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => toggle(t.id)}
                    className="flex items-center justify-between gap-2 w-full text-left px-1.5 py-1 rounded-md hover:bg-[var(--color-app-bg)] transition-colors"
                  >
                    <TagPill name={t.name} colorKey={t.colorKey} />
                    <span className="text-xs text-[var(--color-app-muted)] w-4 text-center">{on ? "✓" : ""}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {creating ? (
            <div className="mt-2 pt-2 border-t space-y-1.5">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void createTag(); } if (e.key === "Escape") setCreating(false); }}
                maxLength={30}
                placeholder="Tag name…"
                className="w-full rounded-md border px-2 py-1 text-xs bg-transparent"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_KEYS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    title={COLOR_LABELS[c]}
                    className="w-5 h-5 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      background: `var(--c-${c}-dot)`,
                      borderColor: c === newColor ? "var(--color-app-text)" : "transparent",
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="text-xs text-[var(--color-app-muted)] hover:text-[var(--color-app-text)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void createTag()}
                  disabled={saving || !newName.trim()}
                  className="btn-accent text-xs px-3 py-1 rounded-md font-medium disabled:opacity-40"
                >
                  {saving ? "…" : "Create"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 pt-2 border-t flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="text-xs text-[var(--color-accent)] hover:underline"
              >
                + New tag
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-[var(--color-app-muted)] hover:text-[var(--color-app-text)]"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
