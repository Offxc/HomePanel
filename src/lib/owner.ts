// Legacy helper kept for callers that still derive a color from a known name.
// New code should pass an explicit `colorKey` from the user record.

import { type ColorKey } from "@/lib/colors";

export type OwnerKey = "off" | "bri" | "both" | "unknown";

export function ownerKeyForName(name: string): OwnerKey {
  const n = name.trim().toLowerCase();
  if (n === "off") return "off";
  if (n === "bri") return "bri";
  if (n === "both") return "both";
  return "unknown";
}

export function colorKeyForOwner(o: OwnerKey): ColorKey {
  if (o === "off") return "teal";
  if (o === "bri") return "pink";
  return "gray";
}

// Kept for compatibility with old call sites; new code uses CSS vars via colorKey.
export function ownerStyle(_o: OwnerKey) {
  return { bg: "", text: "", dot: "" };
}
