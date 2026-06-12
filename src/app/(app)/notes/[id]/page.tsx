import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getHousehold } from "@/lib/household";
import { OwnerPill } from "@/components/owner-pill";
import { AssigneeRadio } from "@/components/assignee-radio";
import { Card } from "@/components/card";
import { editNote, deleteNote } from "../actions";

type Params = Promise<{ id: string }>;

export default async function NoteEditPage({ params }: { params: Params }) {
  await requireSession();
  const { id } = await params;
  const [note, members] = await Promise.all([
    db.note.findUnique({
      where: { id },
      include: { author: { select: { name: true, displayName: true, discordId: true, colorKey: true } } },
    }),
    getHousehold(),
  ]);
  if (!note) notFound();

  const authorMember = members.find((m) => m.id === note.authorId);
  const ownerName = authorMember?.displayName ?? note.author.displayName?.trim() ?? note.author.name ?? "Unknown";
  const ownerColorKey = authorMember?.colorKey ?? note.author.colorKey;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <Link href="/notes" className="text-xs text-[var(--color-app-muted)] hover:text-[var(--color-app-text)]">← All notes</Link>
        <OwnerPill name={ownerName} colorKey={ownerColorKey} />
      </div>
      <form action={editNote} className="space-y-2">
        <input type="hidden" name="id" value={note.id} />
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={note.title}
          className="w-full rounded-md border px-3 py-2 text-base font-medium bg-transparent"
        />
        <textarea
          name="body"
          required
          maxLength={20_000}
          rows={14}
          defaultValue={note.body}
          className="w-full rounded-md border px-3 py-2 text-sm bg-transparent resize-y leading-relaxed"
        />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <AssigneeRadio name="assigneeId" members={members} defaultValue={note.assigneeId ?? ""} />
          <button type="submit" className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-[var(--color-app-bg)]">
            Save
          </button>
        </div>
      </form>
      <form action={deleteNote} className="mt-4 text-right">
        <input type="hidden" name="id" value={note.id} />
        <button type="submit" className="text-xs text-red-600 hover:underline" formNoValidate>
          Delete note
        </button>
      </form>
    </Card>
  );
}
