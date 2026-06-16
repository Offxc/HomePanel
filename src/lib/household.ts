import { cache } from "react";
import { db } from "@/lib/db";
import { displayNameFor } from "@/lib/allowlist";
import { coerceColorKey, type ColorKey } from "@/lib/colors";

export type HouseholdMember = {
  id: string;
  displayName: string;
  colorKey: ColorKey;
  kanbanEnabled: boolean;
};

// Returns the household members in a stable, name-agnostic order: oldest account first.
export const getHousehold = cache(async (): Promise<HouseholdMember[]> => {
  const rows = await db.user.findMany({
    select: { id: true, name: true, displayName: true, discordId: true, colorKey: true, kanbanEnabled: true },
    orderBy: { createdAt: "asc" },
  });
  const members: HouseholdMember[] = rows.map((u) => ({
    id: u.id,
    displayName: u.displayName?.trim() || displayNameFor(u.discordId, u.name),
    colorKey: coerceColorKey(u.colorKey, "gray"),
    kanbanEnabled: u.kanbanEnabled,
  }));
  return members;
});

export function memberById(members: HouseholdMember[], id: string | null | undefined): HouseholdMember | null {
  if (!id) return null;
  return members.find((m) => m.id === id) ?? null;
}

export const BOTH: HouseholdMember = { id: "__both__", displayName: "Both", colorKey: "white", kanbanEnabled: false };
