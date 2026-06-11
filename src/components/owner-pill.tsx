import { coerceColorKey, type ColorKey } from "@/lib/colors";

// Single source of truth for the colored identity pill.
// Pass an explicit name + colorKey. "Both" is just `name="Both" colorKey="gray"`.
export function OwnerPill({
  name,
  colorKey,
  size = "sm",
}: {
  name: string;
  colorKey?: ColorKey | string | null;
  size?: "sm" | "xs";
}) {
  const key: ColorKey = coerceColorKey(colorKey, "gray");
  const sizeCls = size === "xs"
    ? "px-1.5 py-0.5 text-[10px] gap-1"
    : "px-2 py-0.5 text-[11px] gap-1.5";
  const dotCls = size === "xs" ? "w-1 h-1" : "w-1.5 h-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium leading-none ${sizeCls}`}
      style={{ background: `var(--c-${key}-bg)`, color: `var(--c-${key}-text)` }}
    >
      <span className={`${dotCls} rounded-full`} style={{ background: `var(--c-${key}-dot)` }} aria-hidden />
      {name}
    </span>
  );
}
