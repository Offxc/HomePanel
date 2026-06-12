// HomePanel daily digest bot.
// Posts one embed per household member to their own Discord channel at 7am,
// then silently edits it every 15 minutes throughout the day — no re-pinging.

import cron from "node-cron";
import { readFileSync, writeFileSync, existsSync } from "fs";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const API_SECRET = process.env.INTERNAL_API_SECRET;
const APP_URL = process.env.APP_INTERNAL_URL ?? "http://app:3000";
const STATE_FILE = "/data/bot-state.json";

// ── State (tracks which Discord message IDs we sent per date per member) ──────

function loadState() {
  try {
    if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {}
  return {};
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
// State shape: { messages: { "<memberId>": "<discordMessageId>" } }
// One persistent message per channel — edited forever, never re-posted.

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

  const state = loadState();
  if (!state.messages) state.messages = {};

  const now = new Date();
  const updatedAt = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateLabel = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  for (const member of digest.members) {
    const channelId = process.env[`DISCORD_CHANNEL_${member.displayName.toUpperCase()}`];
    if (!channelId) {
      console.log(`No channel configured for ${member.displayName} (set DISCORD_CHANNEL_${member.displayName.toUpperCase()})`);
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

// Every 2 minutes 7am–11pm — edit the persistent message with fresh content
cron.schedule("*/2 * * * *", () => {
  const h = new Date().getHours();
  if (h >= 7 && h < 23) {
    console.log(`${new Date().toLocaleTimeString()} — refreshing digest`);
    sendOrUpdate().catch(console.error);
  }
});

// Startup: post/update immediately if we're in the active window
const startHour = new Date().getHours();
if (startHour >= 7 && startHour < 23) {
  console.log("Startup: posting/updating digest now");
  sendOrUpdate().catch(console.error);
} else {
  console.log("Startup outside active hours — waiting for next 2-min tick");
}

console.log("HomePanel bot running");
