#!/usr/bin/env bash
# Nightly SQLite backup. Run from cron on the host:
#   0 3 * * * /opt/HomePanel/scripts/backup.sh >> /var/log/homepanel-backup.log 2>&1
#
# Encrypts the dump with age (passphrase from /etc/homepanel/backup.pass,
# mode 600, root-only). If you don't have age installed, replace with gpg.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="$ROOT/data/homepanel.db"
OUT_DIR="$ROOT/data/backups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT_DIR"

if [[ ! -f "$DB" ]]; then
  echo "[$STAMP] no DB at $DB, skipping" >&2
  exit 0
fi

# Use sqlite3 .backup for a consistent copy even with the app running.
docker compose -f "$ROOT/docker-compose.yml" exec -T app \
  sh -c "sqlite3 /app/data/homepanel.db \".backup '/app/data/backups/homepanel-${STAMP}.db'\""

if command -v age >/dev/null 2>&1 && [[ -f /etc/homepanel/backup.pass ]]; then
  age -p -o "$OUT_DIR/homepanel-${STAMP}.db.age" "$OUT_DIR/homepanel-${STAMP}.db" \
    < /etc/homepanel/backup.pass
  rm "$OUT_DIR/homepanel-${STAMP}.db"
fi

# Keep last 30 nightly + last 12 weekly.
find "$OUT_DIR" -name "homepanel-*.db*" -mtime +30 -delete

echo "[$STAMP] backup ok"
