// Map month index (0-11) to a season key + label.
// Used to tint the calendar background subtly.

export type Season = "spring" | "summer" | "fall" | "winter";

export function seasonForMonth(month: number): Season {
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export function seasonLabel(s: Season): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
