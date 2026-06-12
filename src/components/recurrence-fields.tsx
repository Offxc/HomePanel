"use client";

import { useState } from "react";

export function RecurrenceFields({
  defaultFreq = "",
  defaultUntil = "",
}: {
  defaultFreq?: string;
  defaultUntil?: string;
} = {}) {
  const [freq, setFreq] = useState(defaultFreq);
  const [forever, setForever] = useState(!!defaultFreq && !defaultUntil);

  return (
    <div className="col-span-2 grid grid-cols-2 gap-2">
      <div className="flex items-center gap-2 text-sm">
        <label className="text-xs text-[var(--color-app-muted)] w-12 flex-shrink-0">Repeats</label>
        <select
          name="recurFreq"
          value={freq}
          onChange={(e) => { setFreq(e.target.value); if (!e.target.value) setForever(false); }}
          className="flex-1 rounded-md border px-2 py-2 text-sm bg-transparent"
        >
          <option value="">Never</option>
          <option value="DAILY">Every day</option>
          <option value="WEEKLY">Every week</option>
          <option value="MONTHLY">Every month</option>
          <option value="YEARLY">Every year</option>
        </select>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className={`text-xs w-12 flex-shrink-0 ${freq ? "text-[var(--color-app-muted)]" : "text-[var(--color-app-muted)]/40"}`}>
          Until
        </label>
        <input
          name="recurUntil"
          type="date"
          disabled={!freq || forever}
          className={`flex-1 rounded-md border px-2 py-2 text-sm bg-transparent transition-opacity ${
            !freq || forever ? "opacity-30 cursor-not-allowed" : "text-[var(--color-app-muted)]"
          }`}
        />
      </div>
      {freq && (
        <label className="col-span-2 flex items-center gap-2 text-sm text-[var(--color-app-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={forever}
            onChange={(e) => setForever(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Forever (no end date)
        </label>
      )}
    </div>
  );
}
