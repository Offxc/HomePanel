import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { displayNameFor } from "@/lib/allowlist";
import { getHousehold } from "@/lib/household";
import { coerceColorKey } from "@/lib/colors";
import { OwnerPill } from "@/components/owner-pill";
import { TagPill } from "@/components/tag-pill";
import { Card, CardTitle } from "@/components/card";
import { TodayViewTabs } from "@/components/today-view-tabs";
import { addDays, endOfDay, formatTime, startOfDay } from "@/lib/dates";
import { expandRecurrence } from "@/lib/recur";

type SearchParams = Promise<{ view?: string }>;

type DbEvent = {
  id: string;
  title: string;
  location: string | null;
  startsAt: Date;
  allDay: boolean;
  assigneeId: string | null;
  recurFreq: string | null;
  recurInterval: number;
  recurUntil: Date | null;
  assignee: { name: string | null; displayName: string | null; discordId: string | null; colorKey: string } | null;
  tags: { tag: { id: string; name: string; colorKey: string } }[];
};

function assigneeName(e: DbEvent): string {
  if (!e.assignee) return "Both";
  return e.assignee.displayName?.trim() || displayNameFor(e.assignee.discordId, e.assignee.name);
}

function assigneeColor(e: DbEvent): string {
  if (!e.assignee) return "gray";
  return coerceColorKey(e.assignee.colorKey, "gray");
}

export default async function TodayPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSession();
  const sp = await searchParams;
  const view = (sp.view ?? "combined").toLowerCase();

  const members = await getHousehold();
  const activeMember = view === "combined" ? null : members.find((m) => m.displayName.toLowerCase() === view) ?? null;

  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const weekEnd = addDays(dayStart, 7);

  const rawEvents = (await db.event.findMany({
    where: {
      OR: [
        { startsAt: { gte: dayStart, lte: weekEnd } },
        {
          recurFreq: { not: null },
          startsAt: { lte: weekEnd },
          OR: [{ recurUntil: null }, { recurUntil: { gte: dayStart } }],
        },
      ],
    },
    include: {
      assignee: { select: { name: true, displayName: true, discordId: true, colorKey: true } },
      tags: { include: { tag: { select: { id: true, name: true, colorKey: true } } } },
    },
    orderBy: { startsAt: "asc" },
  })) as DbEvent[];

  const eventsForView = activeMember
    ? rawEvents.filter((e) => e.assigneeId === activeMember.id || e.assigneeId === null)
    : rawEvents;

  type Inst = { event: DbEvent; at: Date };
  const instances: Inst[] = [];
  for (const e of eventsForView) {
    const dates = expandRecurrence(e, dayStart, weekEnd);
    for (const d of dates) instances.push({ event: e, at: d });
  }
  instances.sort((a, b) => a.at.getTime() - b.at.getTime());

  const todaysItems = instances.filter((i) => i.at <= dayEnd);
  const upcomingItems = instances.filter((i) => i.at > dayEnd);

  // Group today's events by first tag (each event appears once)
  type TagInfo = { id: string; name: string; colorKey: string };
  const todayTagGroups = new Map<string, { tag: TagInfo | null; items: Inst[] }>();
  for (const i of todaysItems) {
    const firstTag = i.event.tags[0]?.tag ?? null;
    const k = firstTag?.id ?? "__untagged__";
    const g = todayTagGroups.get(k) ?? { tag: firstTag, items: [] };
    g.items.push(i);
    todayTagGroups.set(k, g);
  }

  const [openShopCount, topOpenShop] = await Promise.all([
    db.shoppingItem.count({ where: { done: false } }),
    db.shoppingItem.findMany({
      where: { done: false },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const tagGroups = new Map<string, { tag: TagInfo | null; items: Inst[] }>();
  for (const i of upcomingItems) {
    if (i.event.tags.length === 0) {
      const k = "__untagged__";
      const g = tagGroups.get(k) ?? { tag: null, items: [] };
      g.items.push(i);
      tagGroups.set(k, g);
    } else {
      for (const et of i.event.tags) {
        const k = et.tag.id;
        const g = tagGroups.get(k) ?? { tag: et.tag, items: [] };
        g.items.push(i);
        tagGroups.set(k, g);
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <TodayViewTabs current={view} members={members} />
        <div className="text-xs text-[var(--color-app-muted)]">
          {instances.length} event{instances.length === 1 ? "" : "s"} this week
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card hover className="md:col-span-2">
          <CardTitle count={todaysItems.length}>Today</CardTitle>
          {todaysItems.length === 0 && (
            <p className="text-xs text-[var(--color-app-muted)]">Nothing scheduled.</p>
          )}
          {Array.from(todayTagGroups.entries()).map(([key, group], groupIdx) => (
            <div key={key} className={groupIdx > 0 ? "border-t mt-2 pt-2" : ""}>
              {(group.tag !== null || todayTagGroups.size > 1) && (
                <div className="flex items-center gap-2 mb-1">
                  {group.tag ? (
                    <TagPill name={group.tag.name} colorKey={group.tag.colorKey} />
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-app-muted)]/70">
                      Untagged
                    </span>
                  )}
                </div>
              )}
              <ul>
                {group.items.map((i, idx) => (
                  <li
                    key={`${i.event.id}-${i.at.getTime()}-${idx}`}
                    className="flex items-center gap-3 py-2.5 border-t first:border-t-0"
                  >
                    <div className="time-badge px-2.5 py-1.5 rounded-md text-sm font-medium tabular-nums min-w-[58px] text-center">
                      {i.event.allDay ? "All day" : formatTime(i.at).slice(0, 5)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-tight">{i.event.title}</div>
                      {(i.event.location || i.event.tags.length > 1) && (
                        <div className="text-xs text-[var(--color-app-muted)] mt-0.5 flex items-center gap-2 flex-wrap">
                          {i.event.location && <span>{i.event.location}</span>}
                          {i.event.tags.slice(1).map((et) => (
                            <TagPill key={et.tag.id} name={et.tag.name} colorKey={et.tag.colorKey} size="xs" />
                          ))}
                        </div>
                      )}
                    </div>
                    <OwnerPill name={assigneeName(i.event)} colorKey={assigneeColor(i.event)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>

        <Card hover>
          <CardTitle count={`${openShopCount} open`}>Shopping</CardTitle>
          {openShopCount === 0 && <p className="text-xs text-[var(--color-app-muted)]">All done.</p>}
          <ul className="space-y-1">
            {topOpenShop.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-1 text-sm">
                <span className="w-1 h-1 rounded-full bg-[var(--color-app-muted)]" aria-hidden />
                <span className="flex-1 truncate">
                  {s.name}
                  {s.qty && <span className="text-[var(--color-app-muted)] ml-1">· {s.qty}</span>}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/shopping"
            className="block mt-3 text-xs text-[var(--color-accent)] hover:underline"
          >
            Open shopping list →
          </Link>
        </Card>
      </div>

      {Array.from(tagGroups.entries()).map(([key, group]) => (
        <Card key={key} hover>
          <CardTitle count={group.items.length}>
            {group.tag ? (
              <span className="inline-flex items-center gap-2">
                <TagPill name={group.tag.name} colorKey={group.tag.colorKey} />
                <span className="text-[var(--color-app-text)]">in the next week</span>
              </span>
            ) : (
              "Untagged · next week"
            )}
          </CardTitle>
          <ul>
            {group.items.map((i, idx) => (
              <li
                key={`${key}-${i.event.id}-${i.at.getTime()}-${idx}`}
                className="flex items-center gap-3 py-2 border-t first:border-t-0"
              >
                <div className="time-badge px-2 py-1 rounded-md text-xs font-medium tabular-nums min-w-[64px] text-center">
                  {i.at.toLocaleDateString([], { weekday: "short" })}
                  {!i.event.allDay && ` ${formatTime(i.at).slice(0, 5)}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{i.event.title}</div>
                  {i.event.location && (
                    <div className="text-xs text-[var(--color-app-muted)]">{i.event.location}</div>
                  )}
                </div>
                <OwnerPill name={assigneeName(i.event)} colorKey={assigneeColor(i.event)} />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
