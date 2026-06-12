"use client";

import { useState, useTransition } from "react";
import { OwnerPill } from "@/components/owner-pill";
import { AssigneeRadio } from "@/components/assignee-radio";
import type { ColorKey } from "@/lib/colors";
import type { HouseholdMember } from "@/lib/household";

export type NoteData = {
  id: string;
  title: string;
  body: string;
  assigneeId: string | null;
  updatedAt: string; // ISO
  authorName: string;
  authorColorKey: ColorKey;
  assigneeName: string;
  assigneeColorKey: ColorKey;
};

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

export function NoteCard({
  note,
  members,
  onSave,
  onDelete,
}: {
  note: NoteData;
  members: HouseholdMember[];
  onSave: (formData: FormData) => Promise<void> | void;
  onDelete: (formData: FormData) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [assigneeId, setAssigneeId] = useState<string>(note.assigneeId ?? "");
  const [pending, start] = useTransition();

  const save = () => {
    const fd = new FormData();
    fd.append("id", note.id);
    fd.append("title", title);
    fd.append("body", body);
    fd.append("assigneeId", assigneeId);
    start(async () => {
      await onSave(fd);
      setEditing(false);
    });
  };

  const remove = () => {
    if (!confirm("Delete this note?")) return;
    const fd = new FormData();
    fd.append("id", note.id);
    start(async () => {
      await onDelete(fd);
    });
  };

  return (
    <article
      className={`group rounded-xl border bg-[var(--color-app-surface)] p-3.5 min-h-[140px] flex flex-col transition-all lift ${
        pending ? "opacity-60" : ""
      }`}
    >
      {editing ? (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Title"
            className="text-sm font-medium mb-1.5 bg-transparent border-b border-dashed pb-1 focus:outline-none focus:border-[var(--color-accent)]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={20_000}
            rows={6}
            placeholder="Write…"
            className="flex-1 text-xs text-[var(--color-app-text)] leading-relaxed bg-transparent resize-y focus:outline-none"
          />
          <div className="mt-2.5 pt-2 border-t space-y-2">
            <AssigneeRadio
              name="assigneeId-inline"
              members={members}
              defaultValue={assigneeId}
              onChange={setAssigneeId}
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setTitle(note.title); setBody(note.body); setAssigneeId(note.assigneeId ?? ""); setEditing(false); }}
                className="text-xs text-[var(--color-app-muted)] hover:text-[var(--color-app-text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="btn-accent text-xs px-3 py-1 rounded-md font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm font-medium mb-1.5 flex items-start justify-between gap-2">
            <span className="break-words">{note.title}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit"
                title="Edit"
                className="w-6 h-6 inline-flex items-center justify-center rounded-md text-[var(--color-app-muted)] hover:bg-[var(--color-app-bg)] hover:text-[var(--color-app-text)]"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={remove}
                aria-label="Delete"
                title="Delete"
                className="w-6 h-6 inline-flex items-center justify-center rounded-md text-[var(--color-app-muted)] hover:bg-[var(--color-app-bg)] hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
          <div className="text-xs text-[var(--color-app-muted)] leading-relaxed line-clamp-4 whitespace-pre-wrap flex-1">
            {note.body}
          </div>
          <div className="flex items-center justify-between mt-2.5 text-[11px] text-[var(--color-app-muted)]">
            <OwnerPill name={note.assigneeName} colorKey={note.assigneeColorKey} />
            <span>Edited {timeAgo(note.updatedAt)}</span>
          </div>
        </>
      )}
    </article>
  );
}
