// HomePanel daily digest bot.
// Posts one embed per household member at the configured digest hour (@ mentions them),
// then silently edits it through the day — but only when the content actually changes,
// so the "Updated HH:MM" footer reflects the last real change instead of churning the
// Discord API every minute. No re-pinging on edits.

import cron from "node-cron";
import { readFileSync, writeFileSync, existsSync } from "fs";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const API_SECRET = process.env.INTERNAL_API_SECRET;
const APP_URL = process.env.APP_INTERNAL_URL ?? "http://app:3000";
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL ?? "home.example.com";
const FALLBACK_TZ = process.env.TZ || "America/Toronto";
const STATE_FILE = "/data/bot-state.json";

// ── State ─────────────────────────────────────────────────────────────────────
// Shape: { date: "YYYY-MM-DD", messages: { memberId: msgId }, content: { memberId: signature } }
// `content` is the JSON signature of the last-rendered embed (sans timestamp) so we can
// skip no-op edits. When the date rolls over, everything clears for a fresh @mention post.

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      const raw = JSON.parse(readFileSync(STATE_FILE, "utf8"));
      if (raw.messages && typeof raw.messages === "object") {
        return { date: raw.date ?? null, messages: raw.messages, content: raw.content ?? {} };
      }
      // Legacy format: { "2026-06-12": { memberId: msgId, ... }, ... }
      const dates = Object.keys(raw).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
      if (dates.length > 0) {
        const latest = raw[dates[dates.length - 1]];
        console.log("Migrating bot state from legacy date-keyed format →", latest);
        return { date: dates[dates.length - 1], messages: latest, content: {} };
      }
    }
  } catch (e) {
    console.error("state load failed:", e.message);
  }
  return { date: null, messages: {}, content: {} };
}

function saveState(state) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    console.error("state save failed:", e.message);
  }
}

// Current wall-clock parts in a given IANA timezone, independent of the container's TZ.
function zonedNow(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date());
    let hh = parts.find((p) => p.type === "hour")?.value ?? "00";
    const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
    if (hh === "24") hh = "00"; // some ICU builds emit 24 at midnight
    return { hour: parseInt(hh, 10), hh, mm };
  } catch {
    const d = new Date();
    return {
      hour: d.getHours(),
      hh: String(d.getHours()).padStart(2, "0"),
      mm: String(d.getMinutes()).padStart(2, "0"),
    };
  }
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchDigest() {
  const r = await fetch(`${APP_URL}/api/internal/daily-digest`, {
    headers: { Authorization: `Bearer ${API_SECRET}` },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`digest API ${r.status}: ${body}`);
  }
  return r.json();
}

// ── Discord REST ──────────────────────────────────────────────────────────────

async function discord(method, path, body) {
  const r = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Discord ${method} ${path} → ${r.status}: ${text}`);
  }
  if (r.status === 204) return null;
  return r.json();
}

async function getBotUserId() {
  const me = await discord("GET", "/users/@me");
  return me.id;
}

// ── Embed builder ─────────────────────────────────────────────────────────────

function colorInt(hex) {
  return parseInt(hex.replace("#", ""), 16);
}

function eventLines(events) {
  return events.map((e) => {
    const timeStr = e.allDay ? "All day" : e.time;
    const rec = e.isRecurring ? " ↻" : "";
    const both = e.isBoth ? " 👥" : "";
    return `\`${timeStr}\`  ${e.title}${rec}${both}`;
  });
}

// The timestamp-free part of the embed — used both to render and to detect changes.
function buildEmbedContent(member, dateLabel) {
  let eventsValue;
  if (member.events.length === 0) {
    eventsValue = "Nothing scheduled today ✨";
  } else {
    eventsValue = eventLines(member.events).slice(0, 20).join("\n");
    if (member.events.length > 20) eventsValue += `\n*… and ${member.events.length - 20} more*`;
    if (eventsValue.length > 1020) eventsValue = eventsValue.slice(0, 1017) + "…";
  }

  const fields = [{ name: "📅  Today's events", value: eventsValue }];

  if (Array.isArray(member.tomorrow) && member.tomorrow.length > 0) {
    let tomorrowValue = eventLines(member.tomorrow).slice(0, 10).join("\n");
    if (member.tomorrow.length > 10) tomorrowValue += `\n*… and ${member.tomorrow.length - 10} more*`;
    if (tomorrowValue.length > 1020) tomorrowValue = tomorrowValue.slice(0, 1017) + "…";
    fields.push({ name: "📆  Tomorrow", value: tomorrowValue });
  }

  if (member.shopping.length > 0) {
    const lines = member.shopping.slice(0, 12).map(
      (s) => `• ${s.name}${s.qty ? ` *(${s.qty})*` : ""}`
    );
    if (member.shopping.length > 12) lines.push(`*… and ${member.shopping.length - 12} more*`);
    fields.push({ name: `🛒  Shopping  ·  ${member.shopping.length} open`, value: lines.join("\n") });
  }

  return {
    title: `${member.displayName}'s day  ·  ${dateLabel}`,
    color: colorInt(member.colorHex),
    fields,
  };
}

// ── Core send/update logic ────────────────────────────────────────────────────
// One persistent message per channel per day — @mentions on first post, silent edits after,
// and edits only fire when the rendered content has actually changed.

async function sendOrUpdate({ force = false, suppressMention = false } = {}) {
  if (!BOT_TOKEN) { console.error("DISCORD_BOT_TOKEN not set — skipping"); return; }
  if (!API_SECRET) { console.error("INTERNAL_API_SECRET not set — skipping"); return; }

  let digest;
  try {
    digest = await fetchDigest();
  } catch (e) {
    console.error("Could not fetch digest:", e.message);
    return;
  }

  const tz = digest.timezone || FALLBACK_TZ;
  const digestHour = typeof digest.digestHour === "number" ? digest.digestHour : 6;
  const { hour: currentHour, hh, mm } = zonedNow(tz);

  // Outside active window — before the configured digest hour or after 11pm (household-local)
  if (!force && (currentHour < digestHour || currentHour >= 23)) return;

  const state = loadState();
  if (!state.messages) state.messages = {};
  if (!state.content) state.content = {};

  // New calendar day → clear so today's posts include a fresh @mention
  const todayStr = digest.date;
  if (state.date !== todayStr) {
    console.log(`New day (${state.date} → ${todayStr}) — clearing state for fresh @mention posts`);
    state.messages = {};
    state.content = {};
    state.date = todayStr;
  }

  const dateLabel = new Date().toLocaleDateString([], {
    weekday: "long", month: "long", day: "numeric", timeZone: tz,
  });

  for (const member of digest.members) {
    const envKey = `DISCORD_CHANNEL_${member.displayName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    const channelId = member.discordChannelId || process.env[envKey];
    if (!channelId) {
      console.log(`No channel configured for ${member.displayName} — set Discord channel ID in Settings`);
      continue;
    }

    const content = buildEmbedContent(member, dateLabel);
    const signature = JSON.stringify(content);
    const existingId = state.messages[member.id];

    // Nothing changed since the last render — leave the message (and its timestamp) alone.
    if (existingId && state.content[member.id] === signature) continue;

    const embed = { ...content, footer: { text: `${APP_PUBLIC_URL} · Updated ${hh}:${mm}` } };

    if (existingId) {
      try {
        await discord("PATCH", `/channels/${channelId}/messages/${existingId}`, { embeds: [embed] });
        state.content[member.id] = signature;
        console.log(`[${member.displayName}] updated message ${existingId}`);
      } catch (e) {
        console.error(`[${member.displayName}] edit failed (${e.message}), sending new`);
        try {
          const mention = (!suppressMention && member.discordId) ? `<@${member.discordId}>` : undefined;
          const msg = await discord("POST", `/channels/${channelId}/messages`, { content: mention, embeds: [embed] });
          state.messages[member.id] = msg.id;
          state.content[member.id] = signature;
          console.log(`[${member.displayName}] sent replacement message ${msg.id}`);
        } catch (e2) {
          console.error(`[${member.displayName}] send also failed: ${e2.message}`);
        }
      }
    } else {
      try {
        const mention = (!suppressMention && member.discordId) ? `<@${member.discordId}>` : undefined;
        const msg = await discord("POST", `/channels/${channelId}/messages`, { content: mention, embeds: [embed] });
        state.messages[member.id] = msg.id;
        state.content[member.id] = signature;
        console.log(`[${member.displayName}] sent initial message ${msg.id}`);
      } catch (e) {
        console.error(`[${member.displayName}] send failed: ${e.message}`);
      }
    }
  }

  saveState(state);
}

// ── Startup cleanup ───────────────────────────────────────────────────────────
// On restart: wipe every bot message in each digest channel, then post fresh ones.
// (These are dedicated digest channels, so clearing all bot messages is intended.)

async function startup() {
  if (!BOT_TOKEN || !API_SECRET) {
    console.error("Missing DISCORD_BOT_TOKEN or INTERNAL_API_SECRET — startup skipped");
    return;
  }

  let digest;
  try {
    digest = await fetchDigest();
  } catch (e) {
    console.error("Startup: could not fetch digest:", e.message);
    return;
  }

  // Check window FIRST (household-local) — overnight/early restarts do nothing.
  // @mentions only come from the digest-hour cron, never from a restart.
  const tz = digest.timezone || FALLBACK_TZ;
  const digestHour = typeof digest.digestHour === "number" ? digest.digestHour : 6;
  const { hour: currentHour } = zonedNow(tz);
  const inWindow = currentHour >= digestHour && currentHour < 23;

  if (!inWindow) {
    console.log(`Startup: outside active window (${currentHour}h, window=${digestHour}-22) — doing nothing`);
    return;
  }

  let botUserId;
  try {
    botUserId = await getBotUserId();
  } catch (e) {
    console.error("Startup: could not get bot user ID:", e.message);
    return;
  }

  let deleted = 0;
  const state = loadState();

  for (const member of digest.members) {
    const envKey = `DISCORD_CHANNEL_${member.displayName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    const channelId = member.discordChannelId || process.env[envKey];
    if (!channelId) continue;

    // Fetch up to 100 recent messages (Discord's max per call) and delete any from the bot.
    // Catches orphaned embeds even when the state file has been cleared.
    try {
      const messages = await discord("GET", `/channels/${channelId}/messages?limit=100`);
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          if (msg.author?.id === botUserId) {
            try {
              await discord("DELETE", `/channels/${channelId}/messages/${msg.id}`);
              deleted++;
            } catch (e) {
              if (!e.message.includes("404")) console.error(`Startup: delete failed (${msg.id}): ${e.message}`);
            }
          }
        }
      }
    } catch (e) {
      // Fall back to the stored message ID if the channel scan fails (e.g. missing perms)
      console.error(`Startup: channel scan failed for ${member.displayName}: ${e.message}`);
      const oldMsgId = (state.messages ?? {})[member.id];
      if (oldMsgId) {
        try {
          await discord("DELETE", `/channels/${channelId}/messages/${oldMsgId}`);
          deleted++;
        } catch (e2) {
          if (!e2.message.includes("404")) console.error(`Startup: fallback delete failed: ${e2.message}`);
        }
      }
    }
  }

  state.messages = {};
  state.content = {};
  state.date = null;
  saveState(state);
  console.log(`Startup: cleared ${deleted} old embed(s) — posting fresh (no @mention)`);

  await sendOrUpdate({ force: true, suppressMention: true });
}

// ── Scheduling ────────────────────────────────────────────────────────────────

// Every minute — sendOrUpdate checks the active window and only edits on real changes.
cron.schedule("* * * * *", () => {
  sendOrUpdate().catch(console.error);
});

console.log("HomePanel bot starting");
startup().catch(console.error);
