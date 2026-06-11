import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { displayNameFor } from "@/lib/allowlist";
import { OwnerPill } from "@/components/owner-pill";
import { Card } from "@/components/card";
import { editNote, deleteNote } from "../actions";

type Params = Promise<{ id: string }>;

export default async function NoteEditPage({ params }: { params: Params }) {
  await requireSession();
  const { id } = await params;
  const note = await db.note.findUnique({
    where: { id },
    include: { author: { select: { name: true, discordId: true } } },
  });
  if (!note) notFound();
  const owner = displayNameFor(note.author.discordId, note.author.name);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <Link href="/notes" className="text-xs text-[var(--color-app-muted)] hover:text-[var(--color-app-text)]">← All notes</Link>
        <OwnerPill name={owner} ownership={note.ownership === "BOTH" ? "BOTH" : "SHARED"} />
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
        <div className="flex items-center justify-between">
          <select name="ownership" defaultValue={note.ownership} className="rounded-md border px-2 py-2 text-sm bg-transparent">
            <option value="SHARED">Just me</option>
            <option value="BOTH">Both</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-[var(--color-app-bg)]">
              Save
            </button>
          </div>
        </div>
      </form>
      <form action={deleteNote} className="mt-4 text-right">
        <input type="hidden" name="id" value={note.id} />
        <button
          type="submit"
          className="text-xs text-red-600 hover:underline"
          formNoValidate
        >
          Delete note
        </button>
      </form>
    </Card>
  );
}
