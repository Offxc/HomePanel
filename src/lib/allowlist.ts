// Discord ID allow-list + display-name override.
// IDs and names live in env vars so the build artifact is reusable.

const ids = (process.env.ALLOWED_DISCORD_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const displayMap = new Map<string, string>(
  (process.env.DISPLAY_NAMES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [id, name] = pair.split(":");
      return [id?.trim() ?? "", name?.trim() ?? ""] as const;
    })
    .filter(([id, name]) => id && name),
);

export function isAllowed(discordId: string | null | undefined): boolean {
  if (!discordId) return false;
  if (ids.length === 0) return false; // fail closed
  return ids.includes(discordId);
}

export function displayNameFor(discordId: string | null | undefined, fallback: string | null | undefined): string {
  if (discordId && displayMap.has(discordId)) return displayMap.get(discordId)!;
  return fallback?.trim() || "Unknown";
}
