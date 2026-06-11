import { db } from "@/lib/db";
import { displayNameFor } from "@/lib/allowlist";
import { coerceColorKey, type ColorKey } from "@/lib/colors";

export type HouseholdMember = {
  id: string;
  displayName: string;
  colorKey: ColorKey;
  kanbanEnabled: boolean;
};

// Returns the household members (Off + Bri) in a stable order: Off → Bri → other.
export async function getHousehold(): Promise<HouseholdMember[]> {
  const rows = await db.user.findMany({
    where: { discordId: { not: null } },
    select: { id: true, name: true, displayName: true, discordId: true, colorKey: true, kanbanEnabled: true },
  });
  const members: HouseholdMember[] = rows.map((u) => ({
    id: u.id,
    displayName: u.displayName?.trim() || displayNameFor(u.discordId, u.name),
    colorKey: coerceColorKey(u.colorKey, "gray"),
    kanbanEnabled: u.kanbanEnabled,
  }));
  members.sort((a, b) => {
    const rank = (n: string) => (n === "Off" ? 0 : n === "Bri" ? 1 : 2);
    const r = rank(a.displayName) - rank(b.displayName);
    return r !== 0 ? r : a.displayName.localeCompare(b.displayName);
  });
  return members;
}

export function memberById(members: HouseholdMember[], id: string | null | undefined): HouseholdMember | null {
  if (!id) return null;
  return members.find((m) => m.id === id) ?? null;
}

export const BOTH: HouseholdMember = { id: "__both__", displayName: "Both", colorKey: "gray", kanbanEnabled: false };
