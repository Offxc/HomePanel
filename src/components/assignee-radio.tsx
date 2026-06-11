import type { HouseholdMember } from "@/lib/household";

// Segmented control: selected segment gets the surface bg + soft shadow.
// Visually distinct from the read-only display pills.
export function AssigneeRadio({
  name,
  members,
  defaultValue,
}: {
  name: string;
  members: HouseholdMember[];
  defaultValue?: string | "";
}) {
  const options: { value: string; label: string; colorKey: string }[] = [
    ...members.map((m) => ({ value: m.id, label: m.displayName, colorKey: m.colorKey })),
    { value: "", label: "Both", colorKey: "gray" },
  ];
  return (
    <fieldset className="inline-flex items-center gap-2">
      <legend className="text-xs text-[var(--color-app-muted)]">For</legend>
      <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full border bg-[var(--color-app-bg)]">
        {options.map((o) => {
          const id = `${name}-${o.value || "both"}`;
          const checked = (defaultValue ?? "") === o.value;
          return (
            <label key={id} htmlFor={id} className="cursor-pointer relative">
              <input
                id={id}
                type="radio"
                name={name}
                value={o.value}
                defaultChecked={checked}
                className="peer sr-only"
              />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-[var(--color-app-muted)] transition-all peer-checked:text-[var(--color-app-text)] peer-checked:bg-[var(--color-app-surface)] peer-checked:shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: `var(--c-${o.colorKey}-dot)` }}
                  aria-hidden
                />
                {o.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
