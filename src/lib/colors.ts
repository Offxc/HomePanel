// Preset color palette used for user identity pills and tags.
// All colors are exposed as CSS vars `--c-<key>-{bg,text,dot}` in globals.css.

export const COLOR_KEYS = ["teal", "pink", "purple", "amber", "blue", "green", "red", "gray"] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const COLOR_LABELS: Record<ColorKey, string> = {
  teal: "Teal",
  pink: "Pink",
  purple: "Purple",
  amber: "Amber",
  blue: "Blue",
  green: "Green",
  red: "Red",
  gray: "Gray",
};

export function isColorKey(v: unknown): v is ColorKey {
  return typeof v === "string" && (COLOR_KEYS as readonly string[]).includes(v);
}

export function coerceColorKey(v: unknown, fallback: ColorKey = "gray"): ColorKey {
  return isColorKey(v) ? v : fallback;
}

// Inline-style helpers — render via CSS vars so dark mode works automatically.
export function pillStyle(key: ColorKey): React.CSSProperties {
  return {
    background: `var(--c-${key}-bg)`,
    color: `var(--c-${key}-text)`,
  };
}

export function dotStyle(key: ColorKey): React.CSSProperties {
  return { background: `var(--c-${key}-dot)` };
}
