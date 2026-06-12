"use client";

import { useOptimistic, useRef } from "react";
import { NoteCard, type NoteData } from "@/components/note-card";
import { Card } from "@/components/card";
import { AssigneeRadio } from "@/components/assignee-radio";
import { addNote, editNote, deleteNote } from "@/app/(app)/notes/actions";
import type { HouseholdMember } from "@/lib/household";
import type { ColorKey } from "@/lib/colors";

type OptNote = NoteData & { pending?: boolean };

export function NotesList({
  initialNotes,
  members,
  userId,
  userDisplayName,
  userColorKey,
}: {
  initialNotes: NoteData[];
  members: HouseholdMember[];
  userId: string;
  userDisplayName: string;
  userColorKey: ColorKey;
}) {
  const [notes, addOptimistic] = useOptimistic(
    initialNotes as OptNote[],
    (state: OptNote[], n: OptNote) => [n, ...state],
  );

  const formRef = useRef<HTMLFormElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  async function handleAdd(formData: FormData) {
    const title = formData.get("title") as string;
    const body = formData.get("body") as string;
    const assigneeId = (formData.get("assigneeId") as string) || "";
    const assignee = assigneeId ? (members.find((m) => m.id === assigneeId) ?? null) : null;

    addOptimistic({
      id: `__opt_${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      assigneeId: assigneeId || null,
      updatedAt: new Date().toISOString(),
      authorName: userDisplayName,
      authorColorKey: userColorKey,
      assigneeName: assignee?.displayName ?? "Both",
      assigneeColorKey: (assignee?.colorKey ?? "gray") as ColorKey,
      pending: true,
    });

    formRef.current?.reset();
    if (detailsRef.current) detailsRef.current.open = false;
    await addNote(formData);
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {notes.map((n) =>
          n.pending ? (
            <article
              key={n.id}
              className="rounded-xl border bg-[var(--color-app-surface)] p-3.5 min-h-[140px] flex flex-col opacity-50 pointer-events-none select-none"
            >
              <p className="text-sm font-medium mb-1.5 truncate">{n.title}</p>
              <p className="text-xs text-[var(--color-app-muted)] leading-relaxed line-clamp-5 whitespace-pre-wrap flex-1">
                {n.body}
              </p>
            </article>
          ) : (
            <NoteCard
              key={n.id}
              note={n}
              members={members}
              onSave={editNote}
              onDelete={deleteNote}
            />
          )
        )}
        {notes.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 text-sm text-[var(--color-app-muted)] py-6 text-center">
            No notes yet.
          </div>
        )}
      </div>

      <Card hover>
        <details ref={detailsRef}>
          <summary className="text-sm text-[var(--color-app-muted)] cursor-pointer">+ New note</summary>
          <form ref={formRef} action={handleAdd} className="mt-3 space-y-2">
            <input
              name="title"
              required
              maxLength={120}
              placeholder="Title"
              className="w-full rounded-md border px-3 py-2 text-sm bg-transparent"
            />
            <textarea
              name="body"
              required
              maxLength={20_000}
              rows={6}
              placeholder="Write…"
              className="w-full rounded-md border px-3 py-2 text-sm bg-transparent resize-y"
            />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <AssigneeRadio name="assigneeId" members={members} defaultValue={userId} />
              <button type="submit" className="btn-accent text-sm px-3 py-2 rounded-md font-medium">
                Save
              </button>
            </div>
          </form>
        </details>
      </Card>
    </>
  );
}
