import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { KanbanColumn } from "@/components/kanban-column";
import { addColumn } from "./actions";

export default async function KanbanPage() {
  await requireSession();
  const columns = await db.kanbanColumn.findMany({
    orderBy: { order: "asc" },
    include: {
      cards: {
        orderBy: { order: "asc" },
        select: { id: true, title: true },
      },
    },
  });

  return (
    <div className="space-y-3 fade-in">
      <div className="flex items-baseline justify-between">
        <h1 className="text-base font-medium">Kanban</h1>
        <p className="text-xs text-[var(--color-app-muted)]">
          Click a column title to rename · the dot to recolour
        </p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4">
        {columns.map((c, i) => (
          <KanbanColumn
            key={c.id}
            column={{ id: c.id, name: c.name, colorKey: c.colorKey }}
            cards={c.cards}
            prevColumnId={i > 0 ? columns[i - 1].id : null}
            nextColumnId={i < columns.length - 1 ? columns[i + 1].id : null}
          />
        ))}
        <form action={addColumn} className="flex-shrink-0 self-start">
          <button
            type="submit"
            className="rounded-lg border border-dashed border-[var(--color-app-border-strong)] px-4 py-3 text-sm text-[var(--color-app-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-bg)] transition-colors min-w-[200px] text-left"
          >
            + Add column
          </button>
        </form>
      </div>
    </div>
  );
}
