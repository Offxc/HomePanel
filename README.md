<div align="center">

# 🏠 HomePanel

**A self-hosted dashboard for a two-person household.**
Calendar, shopping list, notes, and a kanban board — with a daily Discord digest — all behind a private Discord allow-list.

![Next.js 15](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs&logoColor=white)
![Auth.js v5](https://img.shields.io/badge/Auth.js-v5-9b59b6)
![Prisma + SQLite](https://img.shields.io/badge/Prisma-SQLite-2D3748?logo=prisma&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Self-hosted](https://img.shields.io/badge/self--hosted-Docker%20%2B%20Caddy-0db7ed?logo=docker&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)

</div>

---

## ✨ What it does

| | Feature |
|---|---|
| ☀️ | **Today** — a single glance at today *and* tomorrow, plus your open shopping list. Filter by person (Combined / each member) and group by tag. |
| 📅 | **Calendar** — month grid with recurring events, tags, public holidays, and a subtle seasonal tint. Click any day to expand. |
| 🛒 | **Shopping** — tap a row to cross it off. Assign items to a person or to *Both*. One-tap "clear crossed-off". |
| 📝 | **Notes** — inline-editable cards, assignable, newest first. |
| 🗂️ | **Kanban** — optional per-user board with rename-in-place columns, color dots, and move/edit/delete cards. |
| 🤖 | **Discord digest** — a daily embed per person with today's + tomorrow's events and shopping, quietly updated through the day. |
| 📱 | **Installable** — ships as a PWA, so it adds to a phone home screen and runs full-screen. |
| 🎨 | **Per-person identity** — every member has a color; *Both* shows as a clean white pill throughout. |

> Built for a two-person household, but everything is data-driven — member names, colors, timezone, weather location, and digest hour are all editable in **Settings**.

## 🧱 Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** — Server Components and Server Actions, no client API layer.
- **Auth.js v5** — Discord OAuth, JWT sessions, gated by a Discord-ID allow-list.
- **Prisma + SQLite** — one file, trivial to back up.
- **Tailwind CSS v3** with a small CSS-variable palette (light + dark).
- **Caddy** reverse proxy with automatic Let's Encrypt TLS.
- **Discord bot** — `node-cron` + the Discord REST API, in its own container.

All mutations go through **server actions**; every action calls `requireSession()`, validates input with **Zod**, and is rate-limited.

## 🔒 Security (OWASP-aware)

| Risk | Mitigation |
| --- | --- |
| **A01 Broken access control** | `requireSession()` on every authed page **and** every server action. The Discord-ID allow-list is re-checked on each request, so removing an ID revokes access immediately. |
| **A02 Cryptographic failures** | TLS via Caddy + Let's Encrypt with HSTS preload. `AUTH_SECRET` is 32+ random bytes. |
| **A03 Injection** | Prisma parameterized queries. React auto-escapes output. Zod validates every server-action and API input. |
| **A04 Insecure design** | Single-tenant by design. OAuth-only — no password reset flow to abuse. |
| **A05 Misconfiguration** | **Per-request nonce CSP** (no `unsafe-inline` for scripts in production) via middleware, plus X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy same-origin, and a Permissions-Policy that locks down camera/mic/geo. |
| **A06 Vulnerable components** | `npm run audit` (`npm audit --omit=dev`). Pinned Node 22 in the Docker images. Lockfile committed. |
| **A07 Auth failures** | OAuth only — no passwords. JWT sessions; access is revoked by tightening the allow-list (re-checked per request). Sign-out is audited. Token-bucket rate limiting on every mutating action. |
| **A08 Integrity failures** | Lockfile committed, no third-party CDN scripts, and `strict-dynamic` in the CSP blocks any injected script that lacks the per-request nonce. |
| **A09 Logging failures** | `AuditLog` records sign-in success/denied, sign-out, every delete (events, notes, shopping, tags, kanban), and rate-limit hits. No tokens or PII bodies are logged. |
| **A10 SSRF** | Outbound fetches are limited to Open-Meteo (weather) and Nager.Date (public holidays), both with hard-coded base URLs; lat/lng are validated as floats and the country code as exactly two uppercase letters before use. The internal digest API (`/api/internal/daily-digest`) is guarded by a shared secret and never exposed externally. |

---

## 🚀 Deploying

> 👉 **First time?** Follow **[SETUP.md](SETUP.md)** — a from-zero walkthrough for an Ubuntu Docker VM, covering Discord OAuth, DNS, and `docker compose`, every step spelled out.

### Everyday commands

```bash
cd ~/HomePanel

docker compose logs -f                    # live logs
docker compose restart                    # restart everything
docker compose down                       # stop
git pull && docker compose up -d --build  # pull an update + rebuild

# Back up the database
docker run --rm -v homepanel_data:/data -v ~/:/backup alpine \
  cp /data/homepanel.db /backup/homepanel-backup-$(date +%F).db
```

### Local development

```bash
cp .env.example .env        # then fill in AUTH_SECRET, Discord creds + IDs, your domain
npm install
npm run db:migrate -- --name init
npm run db:seed
npm run dev                 # http://localhost:3000
```

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create + apply a Prisma migration |
| `npm run db:seed` | Seed baseline data |
| `npm run db:studio` | Prisma Studio (DB browser) |
| `npm run audit` | Production dependency audit |

## 🤖 Discord daily digest

A separate `bot` container posts **one embed per person** to their own Discord channel at the configured **digest hour** (default **6:00 AM**, change it in Settings), @mentioning them once.

Through the rest of the day the bot silently **edits that same message** — no new notification — and only when something actually changes, so the `Updated HH:MM` footer reflects the *last real change*. All times use the household timezone from Settings, independent of the server clock.

Each embed shows:

- 📅 **Today's events** — personal + *Both*. All-day events first, then timed. Recurring marked `↻`, shared marked `👥`.
- 📆 **Tomorrow's events** — a heads-up for what's coming.
- 🛒 **Open shopping** — personal + *Both*.

On restart during the active window, the bot clears its old messages in each channel and reposts **without** an @mention. The Discord channels are dedicated to the bot.

The bot uses the **Bot token** from the same Discord application used for OAuth sign-in; the two credentials are independent.

### Environment variables

| Variable | Description |
|---|---|
| `DISCORD_BOT_TOKEN` | Bot token from the **Bot** tab of your Discord app |
| `INTERNAL_API_SECRET` | Shared secret between app and bot — `openssl rand -base64 32` |
| `APP_PUBLIC_URL` | Domain shown in the embed footer (no `https://`) |
| `DISCORD_CHANNEL_<NAME>` | *Optional* — per-member channel ID; the variable name is the member's display name uppercased. Prefer setting each member's channel in **Settings** instead. |

<details>
<summary><strong>Bot setup (one-time)</strong></summary>

1. **Discord Developer Portal** → your app → **Bot** → copy the bot token.
2. **OAuth2 → URL Generator** → scopes `bot` → permissions **Send Messages**, **Embed Links**, **Read Message History** → **Guild Install** → open the URL → add to your server.
3. With Developer Mode on, right-click each channel → **Copy Channel ID** (or set it per-person in Settings).
4. Add the env vars above to `.env` on the VM.
5. `git pull && docker compose up -d --build` — the `bot` service builds and starts automatically.

</details>

## 📱 Install as an app (PWA)

HomePanel ships a web manifest, a service worker, and maskable icons, so it installs to a phone home screen via **Add to Home Screen** and runs full-screen (with safe-area padding for notches). On Android, **Continue with Discord** opens in your default browser via an intent URL, so saved Discord logins just work.

## 📂 Project layout

<details>
<summary>Expand file tree</summary>

```
bot/
  index.mjs                     Daily digest bot — posts, then edits embeds only on change
  package.json                  node-cron dependency
Dockerfile.bot                  Bot container (Node 22 alpine)

src/
  middleware.ts                 Per-request nonce CSP (auth gating happens in pages)
  auth.ts, auth.config.ts       Auth.js + Discord + allow-list

  lib/
    db.ts                       Prisma client singleton
    session.ts                  requireSession / getSessionUser
    allowlist.ts                ALLOWED_DISCORD_IDS + DISPLAY_NAMES parsing
    audit.ts                    AuditLog writer
    rate-limit.ts               In-memory token bucket
    colors.ts                   Color palette (CSS-variable backed)
    household.ts                Members, colors, the "Both" pseudo-member
    config.ts                   Household config (timezone, weather, digest hour)
    weather.ts                  Open-Meteo current weather (3-min cached)
    holidays.ts                 Nager.Date public holidays + Canadian fallback
    season.ts                   Month → season key
    recur.ts                    Recurring-event expansion (anchor-based)
    tags.ts                     Shared tag-create helper (dedupes by name)
    dates.ts                    Date helpers

  app/
    layout.tsx                  Root layout + PWA metadata + nonce'd SW registration
    manifest.ts                 PWA manifest
    signin/                     Discord sign-in screen
    api/
      internal/daily-digest/    Secret-protected API the bot reads
      tags/, weather/           Inline tag creation + weather refresh
      pwa-icon/[size]/          Generated maskable icons
    (app)/
      layout.tsx                Authed shell — header + nav + toasts
      today/                    Today + Tomorrow, person filter, tag groups
      calendar/                 Month grid + recurrence + tags + holidays
      shopping/                 Tap-to-cross list + assignee
      notes/                    Card grid with inline edit + delete
      kanban/                   Columns + cards (optional, per-user)
      settings/                 Profile, location/timezone, digest hour, tags

  components/
    icons.tsx                   Inline SVG icon set (nav, brand, chrome)
    header.tsx                  Brand + date + weather + member pills + settings/sign-out
    nav-tabs.tsx                Top tab bar (conditional Kanban)
    owner-pill.tsx, tag-pill.tsx    Colored pills via CSS vars
    assignee-radio.tsx          Segmented [member | … | Both] control
    tag-picker.tsx              "+ Tag" popover with inline creation
    recurrence-fields.tsx       Repeat-every + until/forever
    today-view-tabs.tsx         Combined / per-member filter
    note-card.tsx, notes-list.tsx       Inline-editable notes
    shop-row.tsx, shopping-list.tsx     Tap-to-check rows + optimistic add
    kanban-column.tsx, kanban-card.tsx  Rename, recolor, move, edit, delete
    calendar-day-panel.tsx      Expanded day view
    weather-widget.tsx          Header weather, self-refreshing
    toast.tsx                   Lightweight toast provider
    card.tsx                    Shared surface with optional hover lift
```

</details>

## 🛡️ VM hardening checklist

- **Firewall:** `ufw default deny incoming && ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable`
- **SSH:** disable password auth, keys only
- **Patches:** enable `unattended-upgrades`
- **Brute-force:** Fail2ban on `sshd`
- **Recovery:** snapshot the VM before each upgrade
