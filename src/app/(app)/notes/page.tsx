import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getHousehold } from "@/lib/household";
import { coerceColorKey } from "@/lib/colors";
import { NoteCard } from "@/components/note-card";
import { Card } from "@/components/card";
import { AssigneeRadio } from "@/components/assignee-radio";
import { addNote, deleteNote, editNote } from "./actions";

export default async function NotesPage() {
  const user = await requireSession();
  const [notes, members] = await Promise.all([
    db.note.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        author: { select: { id: true, name: true, displayName: true, discordId: true, colorKey: true } },
        assignee: { select: { id: true, name: true, displayName: true, discordId: true, colorKey: true } },
      },
      take: 100,
    }),
    getHousehold(),
  ]);
  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="mx-auto max-w-5xl space-y-3 fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {notes.map((n) => {
          const authorMember = memberById.get(n.authorId);
          const authorName = authorMember?.displayName ?? n.author.displayName?.trim() ?? n.author.name ?? "Unknown";
          const authorColorKey = coerceColorKey(authorMember?.colorKey ?? n.author.colorKey, "gray");

          const assigneeMember = n.assigneeId ? memberById.get(n.assigneeId) : null;
          const assigneeName = assigneeMember ? assigneeMember.displayName : "Both";
          const assigneeColorKey = assigneeMember ? assigneeMember.colorKey : coerceColorKey("gray", "gray");

          return (
            <NoteCard
              key={n.id}
              members={members}
              note={{
                id: n.id,
                title: n.title,
                body: n.body,
                assigneeId: n.assigneeId,
                updatedAt: n.updatedAt.toISOString(),
                authorName,
                authorColorKey,
                assigneeName,
                assigneeColorKey,
              }}
              onSave={editNote}
              onDelete={deleteNote}
            />
          );
        })}
        {notes.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 text-sm text-[var(--color-app-muted)] py-6 text-center">No notes yet.</div>
        )}
      </div>

      <Card hover>
        <details>
          <summary className="text-sm text-[var(--color-app-muted)] cursor-pointer">+ New note</summary>
          <form action={addNote} className="mt-3 space-y-2">
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
              <AssigneeRadio name="assigneeId" members={members} defaultValue={user.id} />
              <button type="submit" className="btn-accent text-sm px-3 py-2 rounded-md font-medium">
                Save
              </button>
            </div>
          </form>
        </details>
      </Card>
    </div>
  );
}
