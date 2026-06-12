import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { displayNameFor } from "@/lib/allowlist";
import { getHousehold } from "@/lib/household";
import { coerceColorKey } from "@/lib/colors";
import { OwnerPill } from "@/components/owner-pill";
import { Card, CardTitle } from "@/components/card";
import { addDays, formatTime, startOfDay } from "@/lib/dates";
import { indexHolidays } from "@/lib/holidays";
import { getHouseholdConfig } from "@/lib/config";
import { expandRecurrence } from "@/lib/recur";
import { seasonForMonth } from "@/lib/season";
import { CalendarDayPanel, type DayOccurrence, type EditingEvent } from "@/components/calendar-day-panel";

type SearchParams = Promise<{ y?: string; m?: string; d?: string; edit?: string }>;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoLocalDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type DbEvent = {
  id: string;
  title: string;
  location: string | null;
  startsAt: Date;
  endsAt: Date | null;
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

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireSession();
  const sp = await searchParams;

  const today = startOfDay(new Date());
  const year = sp.y ? Number(sp.y) : today.getFullYear();
  const month = sp.m ? Number(sp.m) - 1 : today.getMonth();
  const selectedDay = sp.d ? Number(sp.d) : null;
  const editId = sp.edit ?? null;

  const monthStart = new Date(year, month, 1);
  const firstDow = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -firstDow);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const config = await getHouseholdConfig();

  const [rawEvents, members, allTags] = await Promise.all([
    db.event.findMany({
      where: {
        OR: [
          { startsAt: { gte: cells[0], lte: addDays(cells[41], 1) } },
          {
            recurFreq: { not: null },
            startsAt: { lte: cells[41] },
            OR: [{ recurUntil: null }, { recurUntil: { gte: cells[0] } }],
          },
        ],
      },
      orderBy: { startsAt: "asc" },
      include: {
        assignee: { select: { name: true, displayName: true, discordId: true, colorKey: true } },
        tags: { include: { tag: { select: { id: true, name: true, colorKey: true } } } },
      },
    }) as Promise<DbEvent[]>,
    getHousehold(),
    db.tag.findMany({ orderBy: { order: "asc" } }),
  ]);

  const editingEvent = editId ? (rawEvents.find((e) => e.id === editId) ?? null) : null;

  // Build occurrences map.
  type Occurrence = { event: DbEvent; at: Date };
  const occByDay = new Map<string, Occurrence[]>();
  for (const e of rawEvents) {
    const dates = expandRecurrence(e, cells[0], addDays(cells[41], 1));
    for (const at of dates) {
      const k = dayKey(at);
      const arr = occByDay.get(k) ?? [];
      arr.push({ event: e, at });
      occByDay.set(k, arr);
    }
  }
  for (const list of occByDay.values()) {
    list.sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  const yearsToCover = Array.from(new Set(cells.map((c) => c.getFullYear())));
  const holidaysByDay = await indexHolidays(yearsToCover, config.countryCode);

  const selectedDate = selectedDay ? new Date(year, month, selectedDay) : null;
  const selectedKey = selectedDate ? dayKey(selectedDate) : null;

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const monthLabel = monthStart.toLocaleDateString([], { month: "long", year: "numeric" });

  const formDefaultStart = new Date(selectedDate ?? today);
  formDefaultStart.setHours(9, 0, 0, 0);

  const season = seasonForMonth(month);

  // Serialize server data for the client CalendarDayPanel
  const serializedOccurrences: DayOccurrence[] = selectedKey
    ? (occByDay.get(selectedKey) ?? []).map((o) => ({
        eventId: o.event.id,
        title: o.event.title,
        location: o.event.location,
        allDay: o.event.allDay,
        recurFreq: o.event.recurFreq,
        tags: o.event.tags.map((et) => et.tag),
        at: o.at.toISOString(),
        timeDisplay: o.event.allDay ? "All day" : formatTime(o.at).slice(0, 5),
        assigneeId: o.event.assigneeId,
        assigneeName: assigneeName(o.event),
        assigneeColorKey: assigneeColor(o.event),
      }))
    : [];

  const serializedEditingEvent: EditingEvent | null = editingEvent
    ? {
        id: editingEvent.id,
        title: editingEvent.title,
        location: editingEvent.location,
        startsAt: isoLocalDateTime(editingEvent.startsAt),
        endsAt: editingEvent.endsAt ? isoLocalDateTime(editingEvent.endsAt) : null,
        allDay: editingEvent.allDay,
        recurFreq: editingEvent.recurFreq,
        recurUntil: editingEvent.recurUntil ? isoLocalDate(editingEvent.recurUntil) : null,
        assigneeId: editingEvent.assigneeId,
        tagIds: editingEvent.tags.map((et) => et.tag.id),
      }
    : null;

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";
  const selectedHolidayNames = selectedKey
    ? (holidaysByDay.get(selectedKey) ?? []).map((h) => h.name)
    : [];

  return (
    <div className="space-y-4 fade-in">
      <Card className={`p-0 overflow-hidden season-tint season-${season}`}>
        <div className="season-content">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-3">
              <div className="text-base font-medium">{monthLabel}</div>
              <Link
                href={`/calendar?y=${today.getFullYear()}&m=${today.getMonth() + 1}&d=${today.getDate()}`}
                className="text-xs px-2 py-1 rounded-md border text-[var(--color-app-muted)] hover:bg-[var(--color-app-bg)] hover:text-[var(--color-app-text)] transition-colors"
              >
                Today
              </Link>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex items-center gap-1.5 mr-2">
                {members.map((m) => (
                  <OwnerPill key={m.id} name={m.displayName} colorKey={m.colorKey} size="xs" />
                ))}
                <OwnerPill name="Both" colorKey="gray" size="xs" />
              </div>
              <Link
                href={`/calendar?y=${prev.getFullYear()}&m=${prev.getMonth() + 1}`}
                aria-label="Previous month"
                className="w-7 h-7 inline-flex items-center justify-center rounded-md border text-[var(--color-app-muted)] hover:bg-[var(--color-app-bg)]"
              >
                ‹
              </Link>
              <Link
                href={`/calendar?y=${next.getFullYear()}&m=${next.getMonth() + 1}`}
                aria-label="Next month"
                className="w-7 h-7 inline-flex items-center justify-center rounded-md border text-[var(--color-app-muted)] hover:bg-[var(--color-app-bg)]"
              >
                ›
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-[11px] text-[var(--color-app-muted)] text-center py-1.5 font-medium border-l first:border-l-0">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const k = dayKey(d);
              const inMonth = d.getMonth() === month;
              const isToday = d.getTime() === today.getTime();
              const isSelected = selectedKey === k;
              const dayOccs = occByDay.get(k) ?? [];
              const dayHolidays = holidaysByDay.get(k) ?? [];
              const hrefFinal =
                d.getMonth() === month
                  ? `/calendar?y=${year}&m=${month + 1}&d=${d.getDate()}`
                  : `/calendar?y=${d.getFullYear()}&m=${d.getMonth() + 1}&d=${d.getDate()}`;
              const maxInline = 2;
              return (
                <Link
                  key={i}
                  href={hrefFinal}
                  className={`group block border-l border-t first:border-l-0 min-h-[64px] sm:min-h-[110px] p-1 sm:p-1.5 text-left transition-all ${
                    inMonth ? "hover:bg-[var(--color-app-bg)]" : "text-[var(--color-app-muted)]/60 hover:bg-[var(--color-app-bg)]/40"
                  } ${isSelected ? "ring-2 ring-inset" : ""}`}
                  style={isSelected ? { boxShadow: "inset 0 0 0 2px var(--color-accent)" } : undefined}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span
                      className={`text-xs tabular-nums ${
                        isToday
                          ? "inline-flex items-center justify-center w-5 h-5 rounded-full font-medium text-white"
                          : ""
                      }`}
                      style={isToday ? { background: "var(--color-accent)" } : undefined}
                    >
                      {d.getDate()}
                    </span>
                    {dayHolidays[0] && (
                      <span
                        className="text-[10px] text-[var(--color-app-muted)] truncate leading-tight max-w-[78%]"
                        title={dayHolidays.map((h) => h.name).join(", ")}
                      >
                        {dayHolidays[0].name}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-0.5">
                    {dayOccs.slice(0, maxInline).map((o, j) => {
                      const name = assigneeName(o.event);
                      const ck = assigneeColor(o.event);
                      return (
                        <li
                          key={`${o.event.id}-${o.at.getTime()}-${j}`}
                          className="flex items-center gap-1 text-[11px] px-1 py-0.5 rounded"
                          style={{
                            background: `var(--c-${ck}-bg)`,
                            color: `var(--c-${ck}-text)`,
                          }}
                          title={`${o.event.title}${o.event.location ? " · " + o.event.location : ""} · ${name}`}
                        >
                          {!o.event.allDay && (
                            <span className="tabular-nums opacity-80 shrink-0 hidden sm:inline">{formatTime(o.at).slice(0, 5)}</span>
                          )}
                          <span className="truncate font-medium">{o.event.title}</span>
                        </li>
                      );
                    })}
                    {dayOccs.length > maxInline && (
                      <li className="text-[10px] text-[var(--color-app-muted)] px-1">
                        +{dayOccs.length - maxInline} more
                      </li>
                    )}
                  </ul>
                </Link>
              );
            })}
          </div>
        </div>
      </Card>

      {selectedDate && selectedDay ? (
        <CalendarDayPanel
          selectedDateLabel={selectedDateLabel}
          holidayNames={selectedHolidayNames}
          initialOccurrences={serializedOccurrences}
          members={members}
          allTags={allTags.map((t) => ({ id: t.id, name: t.name, colorKey: t.colorKey }))}
          editingEvent={serializedEditingEvent}
          editId={editId}
          year={year}
          month={month + 1}
          selectedDay={selectedDay}
          userId={user.id}
          formDefaultStart={isoLocalDateTime(formDefaultStart)}
        />
      ) : (
        <Card hover>
          <CardTitle>This month at a glance</CardTitle>
          <p className="text-xs text-[var(--color-app-muted)]">
            Click any day to see what&apos;s on, add a new event, or set up a recurring series.
          </p>
        </Card>
      )}
    </div>
  );
}
