import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { displayNameFor } from "@/lib/allowlist";
import { COLOR_KEYS, COLOR_LABELS, coerceColorKey } from "@/lib/colors";
import { Card, CardTitle } from "@/components/card";
import { TagPill } from "@/components/tag-pill";
import { OwnerPill } from "@/components/owner-pill";
import { addTag, deleteTag, updateLocation, updateProfile, updateTag } from "./actions";
import { getHouseholdConfig } from "@/lib/config";

export default async function SettingsPage() {
  const sessionUser = await requireSession();
  const [me, tags, locationConfig] = await Promise.all([
    db.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, name: true, displayName: true, discordId: true, colorKey: true, kanbanEnabled: true },
    }),
    db.tag.findMany({ orderBy: { order: "asc" } }),
    getHouseholdConfig(),
  ]);
  if (!me) throw new Error("user not found");

  const fallbackName = displayNameFor(me.discordId, me.name);
  const currentDisplayName = me.displayName?.trim() || fallbackName;
  const currentColorKey = coerceColorKey(me.colorKey, "gray");

  return (
    <div className="mx-auto max-w-3xl space-y-3 fade-in">
      <Card hover>
        <CardTitle>Profile</CardTitle>
        <form action={updateProfile} className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-[var(--color-app-muted)] w-24 flex-shrink-0">Display name</label>
            <input
              name="displayName"
              required
              maxLength={30}
              defaultValue={currentDisplayName}
              className="flex-1 rounded-md border px-3 py-2 text-sm bg-transparent"
            />
            <div className="flex-shrink-0">
              <OwnerPill name={currentDisplayName} colorKey={currentColorKey} />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <label className="text-xs text-[var(--color-app-muted)] w-24 flex-shrink-0 pt-1.5">Pill colour</label>
            <div className="flex flex-wrap gap-2 flex-1">
              {COLOR_KEYS.map((c) => (
                <label key={c} className="cursor-pointer relative">
                  <input
                    type="radio"
                    name="colorKey"
                    value={c}
                    defaultChecked={currentColorKey === c}
                    className="peer sr-only"
                  />
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-2 border-transparent transition-all peer-checked:border-[var(--color-app-text)]"
                    style={{ background: `var(--c-${c}-bg)`, color: `var(--c-${c}-text)` }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: `var(--c-${c}-dot)` }}
                      aria-hidden
                    />
                    {COLOR_LABELS[c]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-[var(--color-app-muted)] w-24 flex-shrink-0">Kanban tab</label>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                name="kanbanEnabled"
                defaultChecked={me.kanbanEnabled}
                className="w-4 h-4 accent-[var(--color-accent)]"
              />
              <span>Show the kanban board in the top navigation</span>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-accent text-sm px-4 py-2 rounded-md font-medium">
              Save profile
            </button>
          </div>
        </form>
      </Card>

      <Card hover>
        <CardTitle>Location</CardTitle>
        <p className="text-xs text-[var(--color-app-muted)] mb-3">
          Controls the weather in the header and which public holidays appear on the calendar.
          Use a 2-letter ISO country code (e.g. <code className="font-mono">CA</code>, <code className="font-mono">US</code>, <code className="font-mono">GB</code>, <code className="font-mono">AU</code>).
          Lat/lng can be found on Google Maps — right-click any location.
        </p>
        <form action={updateLocation} className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-[var(--color-app-muted)] w-24 flex-shrink-0">City name</label>
            <input
              name="weatherCity"
              required
              maxLength={100}
              defaultValue={locationConfig.weatherCity}
              placeholder="Ottawa"
              className="flex-1 rounded-md border px-3 py-2 text-sm bg-transparent"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-[var(--color-app-muted)] w-24 flex-shrink-0">Latitude</label>
            <input
              name="weatherLat"
              required
              type="number"
              step="any"
              min="-90"
              max="90"
              defaultValue={locationConfig.weatherLat}
              className="flex-1 rounded-md border px-3 py-2 text-sm bg-transparent"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-[var(--color-app-muted)] w-24 flex-shrink-0">Longitude</label>
            <input
              name="weatherLng"
              required
              type="number"
              step="any"
              min="-180"
              max="180"
              defaultValue={locationConfig.weatherLng}
              className="flex-1 rounded-md border px-3 py-2 text-sm bg-transparent"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-[var(--color-app-muted)] w-24 flex-shrink-0">Country code</label>
            <input
              name="countryCode"
              required
              maxLength={2}
              defaultValue={locationConfig.countryCode}
              placeholder="CA"
              className="w-20 rounded-md border px-3 py-2 text-sm bg-transparent uppercase"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" className="btn-accent text-sm px-4 py-2 rounded-md font-medium">
              Save location
            </button>
          </div>
        </form>
      </Card>

      <Card id="tags" hover>
        <CardTitle count={tags.length}>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>▦</span> Calendar event tags
          </span>
        </CardTitle>
        <p className="text-xs text-[var(--color-app-muted)] mb-3">
          Tags are attached to <strong>calendar events</strong> only. They&apos;re shared across the
          household, and the Today view groups your week by tag (so a &quot;Work&quot; tag becomes a &quot;Work&quot;
          section). Pick the colour each tag should display in.
        </p>
        <ul className="space-y-2 mb-3">
          {tags.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center gap-2 rounded-md border bg-[var(--color-app-bg)] px-2 py-2"
            >
              <form
                action={updateTag}
                className="flex flex-wrap items-center gap-2 flex-1 min-w-0"
              >
                <input type="hidden" name="id" value={t.id} />
                <div className="flex-shrink-0">
                  <TagPill name={t.name} colorKey={t.colorKey} />
                </div>
                <input
                  name="name"
                  required
                  maxLength={30}
                  defaultValue={t.name}
                  className="flex-1 min-w-[120px] rounded-md border px-2 py-1.5 text-sm bg-[var(--color-app-surface)]"
                />
                <select
                  name="colorKey"
                  defaultValue={t.colorKey}
                  className="rounded-md border px-2 py-1.5 text-sm bg-[var(--color-app-surface)]"
                >
                  {COLOR_KEYS.map((c) => (
                    <option key={c} value={c}>{COLOR_LABELS[c]}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="text-xs px-2 py-1.5 rounded-md border hover:bg-[var(--color-app-surface)]"
                >
                  Save
                </button>
              </form>
              <form action={deleteTag}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  type="submit"
                  aria-label="Delete tag"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md text-[var(--color-app-muted)] hover:text-red-600 hover:bg-[var(--color-app-surface)]"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>

        <form action={async (fd: FormData) => { await addTag(fd); }} className="flex flex-wrap items-center gap-2 border-t pt-3">
          <input
            name="name"
            required
            maxLength={30}
            placeholder="New tag name…"
            className="flex-1 min-w-[160px] rounded-md border px-3 py-2 text-sm bg-transparent"
          />
          <select
            name="colorKey"
            defaultValue="purple"
            className="rounded-md border px-2 py-2 text-sm bg-transparent"
          >
            {COLOR_KEYS.map((c) => (
              <option key={c} value={c}>{COLOR_LABELS[c]}</option>
            ))}
          </select>
          <button
            type="submit"
            className="btn-accent text-sm px-3 py-2 rounded-md font-medium"
          >
            Add tag
          </button>
        </form>
      </Card>
    </div>
  );
}
