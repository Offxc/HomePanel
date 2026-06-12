# HomePanel

A self-hosted shared household panel — calendar (with tags, recurring events, Canadian holidays), shopping list, notes, kanban — behind a Discord-OAuth allow-list.

## Stack

- Next.js 15 (App Router) + TypeScript
- Auth.js v5 with Discord provider, database sessions, allow-list gate
- Prisma + SQLite (single file, easy to back up)
- Tailwind CSS v3
- Caddy reverse proxy with automatic TLS

All mutations go through server actions; every action calls `requireSession()` and validates input with Zod.

## Security (OWASP-aware)

| Risk | Mitigation |
| --- | --- |
| A01 Broken access control | `requireSession()` on every authed page + every server action. Discord-ID allow-list re-checked on each request. |
| A02 Cryptographic failures | TLS terminated by Caddy with Let's Encrypt + HSTS preload. `AUTH_SECRET` is 32+ random bytes. |
| A03 Injection | Prisma parameterized queries. React auto-escapes. Zod validates every server-action input. |
| A04 Insecure design | Single-tenant by design. OAuth-only — no password reset flow to abuse. |
| A05 Misconfiguration | Strict CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy same-origin, Permissions-Policy locks down camera/mic/geo. |
| A06 Vulnerable components | `npm audit` script. Pinned Node 22 in Dockerfile. |
| A07 Auth failures | OAuth only — no passwords. Database session strategy (revocable). Sign-out audited. Rate limit on auth endpoints in both app and Caddy. |
| A08 Integrity failures | Lockfile committed. No CDN scripts. |
| A09 Logging failures | `AuditLog` table records sign-in success/denied, sign-out, deletes, rate-limit hits. No tokens or PII bodies logged. |
| A10 SSRF | The only outbound server fetch is Open-Meteo for weather — hard-coded URL, no user input. |

---

# Deploying

👉 **First-time setup: follow [SETUP.md](SETUP.md).** It's a from-zero walkthrough for an Ubuntu Docker VM, including Discord OAuth, DNS, and `docker compose` — every step written out.

## Quick reference (after first deploy)

```bash
cd ~/HomePanel

# Live logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Pull update + rebuild
git pull && docker compose up -d --build

# Back up the database
cp data/homepanel.db ~/homepanel-backup-$(date +%F).db
```

## Local dev

```bash
cp .env.example .env
# fill in AUTH_SECRET, Discord creds, Discord IDs, your domain
npm install
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

App at http://localhost:3000.

## File layout

```
src/
  auth.ts, auth.config.ts        Auth.js + Discord + allow-list
  middleware.ts                   No-op (gating happens in pages)
  lib/
    db.ts                         Prisma client singleton
    session.ts                    requireSession / getSessionUser
    allowlist.ts                  ALLOWED_DISCORD_IDS + DISPLAY_NAMES parsing
    audit.ts                      AuditLog writer
    rate-limit.ts                 In-memory token bucket
    colors.ts                     8-color palette
    household.ts                  Members + colorKey
    weather.ts                    Open-Meteo weather (15-min cached)
    holidays.ts                   Canadian statutory holidays (computed)
    season.ts                     Month → season key
    recur.ts                      Recurring-event expansion
    dates.ts                      Date helpers
  app/
    signin/page.tsx               Discord sign-in screen
    (app)/
      layout.tsx                  Authed shell — header + nav
      today/                      Combined / Off / Bri tabs + tag-grouped sections
      calendar/                   Month grid + recurrence + tags + holidays
      shopping/                   Tap-to-cross list + assignee
      notes/                      Card grid with inline edit + delete
      kanban/                     Columns with click-to-rename + color + add/delete
      settings/                   Profile + calendar event tags manager
  components/
    header.tsx                    Brand + date + weather + user pills
    nav-tabs.tsx                  Top tab bar (conditional Kanban)
    owner-pill.tsx, tag-pill.tsx  Colored pills via CSS vars
    assignee-radio.tsx            Segmented control For [Off|Bri|Both]
    tag-picker.tsx                "+ Tag" popover with inline tag creation
    today-view-tabs.tsx           Combined / Off / Bri filter
    note-card.tsx                 Inline-editable note card
    kanban-column.tsx             Click-to-rename, color picker, add/delete column
    kanban-card.tsx               Inline edit + ← → move + delete
    recurrence-fields.tsx         Repeats-every + forever checkbox
    shop-row.tsx                  Tap-to-check shopping row
    card.tsx                      Shared surface with optional hover lift
```

## Hardening checklist for the VM

- UFW: `ufw default deny incoming && ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable`
- Disable SSH password auth, keys only
- `unattended-upgrades` for OS patches
- Fail2ban on sshd
- Snapshot the VM before each upgrade
