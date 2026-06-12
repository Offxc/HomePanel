import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getHousehold } from "@/lib/household";
import { coerceColorKey } from "@/lib/colors";
import { NotesList } from "@/components/notes-list";
import type { ColorKey } from "@/lib/colors";
import type { NoteData } from "@/components/note-card";

export default async function NotesPage() {
  const user = await requireSession();
  const [notes, members, me] = await Promise.all([
    db.note.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        author: { select: { id: true, name: true, displayName: true, discordId: true, colorKey: true } },
        assignee: { select: { id: true, name: true, displayName: true, discordId: true, colorKey: true } },
      },
      take: 100,
    }),
    getHousehold(),
    db.user.findUnique({
      where: { id: user.id },
      select: { displayName: true, colorKey: true },
    }),
  ]);
  const memberById = new Map(members.map((m) => [m.id, m]));

  const userDisplayName = me?.displayName?.trim() || user.name || "Unknown";
  const userColorKey = coerceColorKey(me?.colorKey, "gray") as ColorKey;

  const noteData: NoteData[] = notes.map((n) => {
    const authorMember = memberById.get(n.authorId);
    const authorName = authorMember?.displayName ?? n.author.displayName?.trim() ?? n.author.name ?? "Unknown";
    const authorColorKey = coerceColorKey(authorMember?.colorKey ?? n.author.colorKey, "gray") as ColorKey;
    const assigneeMember = n.assigneeId ? memberById.get(n.assigneeId) : null;
    const assigneeName = assigneeMember ? assigneeMember.displayName : "Both";
    const assigneeColorKey = coerceColorKey(assigneeMember?.colorKey ?? "gray", "gray") as ColorKey;
    return {
      id: n.id,
      title: n.title,
      body: n.body,
      assigneeId: n.assigneeId,
      updatedAt: n.updatedAt.toISOString(),
      authorName,
      authorColorKey,
      assigneeName,
      assigneeColorKey,
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-3 fade-in">
      <NotesList
        initialNotes={noteData}
        members={members}
        userId={user.id}
        userDisplayName={userDisplayName}
        userColorKey={userColorKey}
      />
    </div>
  );
}
