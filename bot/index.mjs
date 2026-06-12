// HomePanel daily digest bot.
// Posts one embed per household member at the configured digest hour (@ mentions them),
// then silently edits it every 2 minutes throughout the day — no re-pinging.

import cron from "node-cron";
import { readFileSync, writeFileSync, existsSync } from "fs";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const API_SECRET = process.env.INTERNAL_API_SECRET;
const APP_URL = process.env.APP_INTERNAL_URL ?? "http://app:3000";
const STATE_FILE = "/data/bot-state.json";

// ── State ─────────────────────────────────────────────────────────────────────
// Shape: { date: "YYYY-MM-DD", messages: { "<memberId>": "<discordMessageId>" } }
// date tracks which calendar day the current messages belong to.
// When the date rolls over, messages are cleared and a fresh @mention post is made.

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      const raw = JSON.parse(readFileSync(STATE_FILE, "utf8"));
      // Current format: { date, messages }
      if (raw.messages && typeof raw.messages === "object") return raw;
      // Legacy format: { "2026-06-12": { memberId: msgId, ... }, ... }
      const dates = Object.keys(raw).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
      if (dates.length > 0) {
        const latest = raw[dates[dates.length - 1]];
        console.log("Migrating bot state from legacy date-keyed format →", latest);
        return { date: dates[dates.length - 1], messages: latest };
      }
    }
  } catch (e) {
    console.error("state load failed:", e.message);
  }
  return { date: null, messages: {} };
}

function saveState(state) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    console.error("state save failed:", e.message);
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
  return r.json();
}

// ── Embed builder ─────────────────────────────────────────────────────────────

function colorInt(hex) {
  return parseInt(hex.replace("#", ""), 16);
}

function buildEmbed(member, dateLabel, updatedAt) {
  // Events
  let eventsValue;
  if (member.events.length === 0) {
    eventsValue = "Nothing scheduled today ✨";
  } else {
    const lines = member.events.map((e) => {
      const timeStr = e.allDay ? "All day" : e.time;
      const rec = e.isRecurring ? " ↻" : "";
      const both = e.isBoth ? " 👥" : "";
      return `\`${timeStr}\`  ${e.title}${rec}${both}`;
    });
    eventsValue = lines.slice(0, 20).join("\n");
    if (member.events.length > 20) eventsValue += `\n*… and ${member.events.length - 20} more*`;
    if (eventsValue.length > 1020) eventsValue = eventsValue.slice(0, 1017) + "…";
  }

  const fields = [{ name: "📅  Today's events", value: eventsValue }];

  // Shopping (only if there are open items)
  if (member.shopping.length > 0) {
    const lines = member.shopping.slice(0, 12).map(
      (s) => `• ${s.name}${s.qty ? ` *(${s.qty})*` : ""}`
    );
    if (member.shopping.length > 12) lines.push(`*… and ${member.shopping.length - 12} more*`);
    fields.push({
      name: `🛒  Shopping  ·  ${member.shopping.length} open`,
      value: lines.join("\n"),
    });
  }

  return {
    title: `${member.displayName}'s day  ·  ${dateLabel}`,
    color: colorInt(member.colorHex),
    fields,
    footer: { text: `Updated ${updatedAt}  ·  home.offlabs.cc` },
    timestamp: new Date().toISOString(),
  };
}

// ── Core send/update logic ────────────────────────────────────────────────────
// One persistent message per channel per day — @mentions on first post, silent edits after.

async function sendOrUpdate() {
  if (!BOT_TOKEN) { console.error("DISCORD_BOT_TOKEN not set — skipping"); return; }
  if (!API_SECRET) { console.error("INTERNAL_API_SECRET not set — skipping"); return; }

  let digest;
  try {
    digest = await fetchDigest();
  } catch (e) {
    console.error("Could not fetch digest:", e.message);
    return;
  }

  const digestHour = typeof digest.digestHour === "number" ? digest.digestHour : 6;
  const now = new Date();
  const currentHour = now.getHours();

  // Outside active window — before the configured digest hour or after 11pm
  if (currentHour < digestHour || currentHour >= 23) return;

  const state = loadState();
  if (!state.messages) state.messages = {};

  // New calendar day → clear message IDs so today's posts include a fresh @mention
  const todayStr = digest.date;
  if (state.date !== todayStr) {
    console.log(`New day (${state.date} → ${todayStr}) — clearing message IDs for fresh @mention posts`);
    state.messages = {};
    state.date = todayStr;
  }

  const updatedAt = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateLabel = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  for (const member of digest.members) {
    // Prefer channel ID stored in the DB (set via Settings); fall back to env var for existing setups
    const envKey = `DISCORD_CHANNEL_${member.displayName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    const channelId = member.discordChannelId || process.env[envKey];
    if (!channelId) {
      console.log(`No channel configured for ${member.displayName} — set Discord channel ID in Settings`);
      continue;
    }

    const embed = buildEmbed(member, dateLabel, updatedAt);
    const existingId = state.messages[member.id];

    if (existingId) {
      try {
        await discord("PATCH", `/channels/${channelId}/messages/${existingId}`, { embeds: [embed] });
        console.log(`[${member.displayName}] updated message ${existingId}`);
      } catch (e) {
        // Message was deleted — send a fresh one and remember the new ID
        console.error(`[${member.displayName}] edit failed (${e.message}), sending new`);
        try {
          const mention = member.discordId ? `<@${member.discordId}>` : undefined;
          const msg = await discord("POST", `/channels/${channelId}/messages`, { content: mention, embeds: [embed] });
          state.messages[member.id] = msg.id;
          console.log(`[${member.displayName}] sent replacement message ${msg.id}`);
        } catch (e2) {
          console.error(`[${member.displayName}] send also failed: ${e2.message}`);
        }
      }
    } else {
      try {
        const mention = member.discordId ? `<@${member.discordId}>` : undefined;
        const msg = await discord("POST", `/channels/${channelId}/messages`, { content: mention, embeds: [embed] });
        state.messages[member.id] = msg.id;
        console.log(`[${member.displayName}] sent initial message ${msg.id}`);
      } catch (e) {
        console.error(`[${member.displayName}] send failed: ${e.message}`);
      }
    }
  }

  saveState(state);
}

// ── Scheduling ────────────────────────────────────────────────────────────────

// Every minute — sendOrUpdate itself checks digestHour and the active window
cron.schedule("* * * * *", () => {
  console.log(`${new Date().toLocaleTimeString()} — tick`);
  sendOrUpdate().catch(console.error);
});

// Startup: attempt immediately (sendOrUpdate will skip if outside the window)
console.log("Startup: attempting digest post/update");
sendOrUpdate().catch(console.error);

console.log("HomePanel bot running");
