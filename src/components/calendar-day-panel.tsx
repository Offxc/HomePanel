"use client";

import { useOptimistic, useRef } from "react";
import Link from "next/link";
import { OwnerPill } from "@/components/owner-pill";
import { TagPill } from "@/components/tag-pill";
import { AssigneeRadio } from "@/components/assignee-radio";
import { TagPicker } from "@/components/tag-picker";
import { RecurrenceFields } from "@/components/recurrence-fields";
import { addEvent, deleteEvent, editEvent } from "@/app/(app)/calendar/actions";
import { useToast } from "@/components/toast";
import type { HouseholdMember } from "@/lib/household";

export type DayOccurrence = {
  eventId: string;
  title: string;
  location: string | null;
  allDay: boolean;
  recurFreq: string | null;
  tags: { id: string; name: string; colorKey: string }[];
  at: string;
  timeDisplay: string;
  assigneeId: string | null;
  assigneeName: string;
  assigneeColorKey: string;
  pending?: boolean;
};

export type EditingEvent = {
  id: string;
  title: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  recurFreq: string | null;
  recurUntil: string | null;
  assigneeId: string | null;
  tagIds: string[];
};

type Tag = { id: string; name: string; colorKey: string };

export function CalendarDayPanel({
  selectedDateLabel,
  holidayNames,
  initialOccurrences,
  members,
  allTags,
  editingEvent,
  editId,
  year,
  month,
  selectedDay,
  userId,
  formDefaultStart,
}: {
  selectedDateLabel: string;
  holidayNames: string[];
  initialOccurrences: DayOccurrence[];
  members: HouseholdMember[];
  allTags: Tag[];
  editingEvent: EditingEvent | null;
  editId: string | null;
  year: number;
  month: number;
  selectedDay: number;
  userId: string;
  formDefaultStart: string;
}) {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [occurrences, addOptimistic] = useOptimistic(
    initialOccurrences,
    (state: DayOccurrence[], o: DayOccurrence) => [...state, o],
  );

  async function handleAdd(formData: FormData) {
    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const allDay = formData.get("allDay") === "on";
    const startsAtRaw = (formData.get("startsAt") as string | null) ?? formDefaultStart;
    const at = new Date(startsAtRaw);
    const timeDisplay = allDay
      ? "All day"
      : `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
    const assigneeId = (formData.get("assigneeId") as string | null) || null;
    const member = assigneeId ? (members.find((m) => m.id === assigneeId) ?? null) : null;

    addOptimistic({
      eventId: `__opt_${Date.now()}`,
      title,
      location: (formData.get("location") as string | null) || null,
      allDay,
      recurFreq: (formData.get("recurFreq") as string | null) || null,
      tags: [],
      at: at.toISOString(),
      timeDisplay,
      assigneeId,
      assigneeName: member?.displayName ?? "Both",
      assigneeColorKey: member?.colorKey ?? "gray",
      pending: true,
    });

    formRef.current?.reset();
    await addEvent(formData);
    showToast("Event added");
  }

  return (
    <div className="rounded-xl border bg-[var(--color-app-surface)] p-4 space-y-0">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-base font-medium">{selectedDateLabel}</div>
          {holidayNames.length > 0 && (
            <div className="text-xs text-[var(--color-app-muted)] mt-0.5">
              {holidayNames.join(" · ")}
            </div>
          )}
        </div>
        <Link
          href={`/calendar?y=${year}&m=${month}`}
          className="text-xs text-[var(--color-app-muted)] hover:text-[var(--color-app-text)]"
        >
          Close
        </Link>
      </div>

      {/* Event list */}
      <ul className="mb-4">
        {occurrences.length === 0 && (
          <li className="text-xs text-[var(--color-app-muted)] py-2">Nothing scheduled.</li>
        )}
        {occurrences.map((o, j) => (
          <li
            key={`${o.eventId}-${j}`}
            className={`flex items-center gap-2 sm:gap-3 py-2 border-t first:border-t-0 ${
              o.pending ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <div className="time-badge px-2 py-1 rounded-md text-xs font-medium tabular-nums min-w-[52px] sm:min-w-[58px] text-center flex-shrink-0">
              {o.timeDisplay}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{o.title}</div>
              <div className="text-xs text-[var(--color-app-muted)] flex flex-wrap gap-1.5 items-center mt-0.5">
                {o.location && <span className="truncate max-w-[120px]">{o.location}</span>}
                {o.recurFreq && <span title={`Repeats ${o.recurFreq.toLowerCase()}`}>↻</span>}
                {o.tags.map((t) => (
                  <TagPill key={t.id} name={t.name} colorKey={t.colorKey} size="xs" />
                ))}
              </div>
            </div>
            <OwnerPill name={o.assigneeName} colorKey={o.assigneeColorKey} />
            {!o.pending && (
              <>
                <Link
                  href={`/calendar?y=${year}&m=${month}&d=${selectedDay}&edit=${o.eventId}`}
                  aria-label="Edit event"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md text-[var(--color-app-muted)] hover:bg-[var(--color-app-bg)] hover:text-[var(--color-app-text)] transition-colors text-base flex-shrink-0"
                >
                  ✎
                </Link>
                <form action={deleteEvent}>
                  <input type="hidden" name="id" value={o.eventId} />
                  <button
                    type="submit"
                    aria-label="Delete event"
                    className="w-7 h-7 inline-flex items-center justify-center rounded-md text-[var(--color-app-muted)] hover:bg-[var(--color-app-bg)] hover:text-red-600 transition-colors flex-shrink-0"
                  >
                    ×
                  </button>
                </form>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* Add / Edit form */}
      {editingEvent ? (
        <form action={editEvent} className="mt-2 grid grid-cols-2 gap-2 border-t pt-4">
          <input type="hidden" name="id" value={editingEvent.id} />
          <input type="hidden" name="_y" value={String(year)} />
          <input type="hidden" name="_m" value={String(month)} />
          <input type="hidden" name="_d" value={String(selectedDay)} />
          <div className="col-span-2 flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[var(--color-app-muted)]">Edit event</span>
            <Link
              href={`/calendar?y=${year}&m=${month}&d=${selectedDay}`}
              className="text-xs text-[var(--color-app-muted)] hover:text-[var(--color-app-text)]"
            >
              Cancel
            </Link>
          </div>
          <input
            name="title"
            required
            maxLength={200}
            placeholder="Title"
            defaultValue={editingEvent.title}
            className="col-span-2 rounded-md border px-3 py-2 text-sm bg-transparent"
          />
          <input
            name="location"
            maxLength={120}
            placeholder="Location (optional)"
            defaultValue={editingEvent.location ?? ""}
            className="col-span-2 rounded-md border px-3 py-2 text-sm bg-transparent"
          />
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={editingEvent.startsAt}
            className="col-span-2 sm:col-span-1 rounded-md border px-2 py-2 text-sm bg-transparent"
          />
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={editingEvent.endsAt ?? ""}
            className="col-span-2 sm:col-span-1 rounded-md border px-2 py-2 text-sm bg-transparent"
          />
          <label className="flex items-center gap-2 text-sm text-[var(--color-app-muted)] col-span-2">
            <input
              type="checkbox"
              name="allDay"
              defaultChecked={editingEvent.allDay}
              className="accent-[var(--color-accent)]"
            />{" "}
            All day
          </label>
          <RecurrenceFields
            defaultFreq={editingEvent.recurFreq ?? ""}
            defaultUntil={editingEvent.recurUntil ?? ""}
          />
          <div className="col-span-2 flex items-center flex-wrap gap-3 border-t pt-3">
            <AssigneeRadio
              name="assigneeId"
              members={members}
              defaultValue={editingEvent.assigneeId ?? ""}
            />
            <TagPicker
              name="tagIds"
              available={allTags}
              defaultSelectedIds={editingEvent.tagIds}
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" className="btn-accent text-sm px-4 py-2 rounded-md font-medium">
              Save changes
            </button>
          </div>
        </form>
      ) : (
        <form ref={formRef} action={handleAdd} className="grid grid-cols-2 gap-2 border-t pt-4">
          <input
            name="title"
            required
            maxLength={200}
            placeholder="Title"
            className="col-span-2 rounded-md border px-3 py-2 text-sm bg-transparent"
          />
          <input
            name="location"
            maxLength={120}
            placeholder="Location (optional)"
            className="col-span-2 rounded-md border px-3 py-2 text-sm bg-transparent"
          />
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={formDefaultStart}
            className="col-span-2 sm:col-span-1 rounded-md border px-2 py-2 text-sm bg-transparent"
          />
          <input
            name="endsAt"
            type="datetime-local"
            className="col-span-2 sm:col-span-1 rounded-md border px-2 py-2 text-sm bg-transparent"
          />
          <label className="flex items-center gap-2 text-sm text-[var(--color-app-muted)] col-span-2">
            <input type="checkbox" name="allDay" className="accent-[var(--color-accent)]" /> All day
          </label>
          <RecurrenceFields />
          <div className="col-span-2 flex items-center flex-wrap gap-3 border-t pt-3">
            <AssigneeRadio name="assigneeId" members={members} defaultValue={userId} />
            <TagPicker name="tagIds" available={allTags} />
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" className="btn-accent text-sm px-4 py-2 rounded-md font-medium">
              Add event
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
