import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getHousehold } from "@/lib/household";
import { expandRecurrence } from "@/lib/recur";
import { startOfDay, endOfDay, formatTime } from "@/lib/dates";

const COLOR_HEX: Record<string, string> = {
  teal: "#1D9E75",
  pink: "#D4537E",
  purple: "#7C3AED",
  amber: "#D97706",
  blue: "#2563EB",
  green: "#16A34A",
  red: "#DC2626",
  gray: "#6B7280",
};

export async function GET(req: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const [members, rawEvents, openShop] = await Promise.all([
    getHousehold(),
    db.event.findMany({
      where: {
        OR: [
          { recurFreq: null, startsAt: { gte: dayStart, lte: dayEnd } },
          {
            recurFreq: { not: null },
            startsAt: { lte: dayEnd },
            OR: [{ recurUntil: null }, { recurUntil: { gte: dayStart } }],
          },
        ],
      },
      orderBy: { startsAt: "asc" },
    }),
    db.shoppingItem.findMany({
      where: { done: false },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Expand recurring events and collect all today instances
  type Instance = {
    title: string;
    allDay: boolean;
    time: string | null;
    isRecurring: boolean;
    isBoth: boolean;
    assigneeId: string | null;
  };

  const allInstances: Instance[] = [];
  for (const ev of rawEvents) {
    const dates = expandRecurrence(ev, dayStart, dayEnd);
    for (const d of dates) {
      allInstances.push({
        title: ev.title,
        allDay: ev.allDay,
        time: ev.allDay ? null : formatTime(d),
        isRecurring: !!ev.recurFreq,
        isBoth: ev.assigneeId === null,
        assigneeId: ev.assigneeId,
      });
    }
  }

  // All-day events first, then sorted by time string
  allInstances.sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return 0;
  });

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const result = members.map((m) => ({
    id: m.id,
    displayName: m.displayName,
    colorHex: COLOR_HEX[m.colorKey] ?? "#6B7280",
    events: allInstances
      .filter((i) => i.assigneeId === m.id || i.assigneeId === null)
      .map(({ assigneeId: _id, ...rest }) => rest),
    shopping: openShop
      .filter((s) => s.assigneeId === m.id || s.assigneeId === null)
      .map((s) => ({ name: s.name, qty: s.qty ?? null, isBoth: s.assigneeId === null })),
  }));

  return NextResponse.json({ date: todayStr, generatedAt: now.toISOString(), members: result });
}
