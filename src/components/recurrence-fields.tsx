// Plain server-rendered fragment of inputs for recurrence config.
// Used inside the "add event" form.
export function RecurrenceFields() {
  return (
    <div className="col-span-2 grid grid-cols-2 gap-2">
      <div className="flex items-center gap-2 text-sm">
        <label className="text-xs text-[var(--color-app-muted)] w-12 flex-shrink-0">Repeats</label>
        <select
          name="recurFreq"
          defaultValue=""
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
        <label className="text-xs text-[var(--color-app-muted)] w-12 flex-shrink-0">Until</label>
        <input
          name="recurUntil"
          type="date"
          className="flex-1 rounded-md border px-2 py-2 text-sm bg-transparent text-[var(--color-app-muted)]"
        />
      </div>
    </div>
  );
}
