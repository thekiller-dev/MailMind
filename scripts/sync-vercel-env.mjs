#!/usr/bin/env node
/**
 * Upsert MailMind production/preview env vars on Vercel via REST API.
 *
 * Requires:
 *   VERCEL_TOKEN          — https://vercel.com/account/tokens
 *   Optional overrides:
 *   VERCEL_PROJECT_ID     — default prj_dTLRdKt9TLSPhlxBPhwM5indpsxC
 *   VERCEL_TEAM_ID        — default team_agg4suklO3fdLfT6xUswxFF6
 *
 * Reads values from local .env (never prints secret values).
 *
 * Usage:
 *   set VERCEL_TOKEN=...
 *   node scripts/sync-vercel-env.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_dTLRdKt9TLSPhlxBPhwM5indpsxC";
const TEAM_ID = process.env.VERCEL_TEAM_ID || "team_agg4suklO3fdLfT6xUswxFF6";
const TOKEN = process.env.VERCEL_TOKEN?.trim();

if (!TOKEN) {
  console.error("Missing VERCEL_TOKEN. Create one at https://vercel.com/account/tokens");
  process.exit(1);
}

function loadDotEnv(path) {
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const local = loadDotEnv(resolve(".env"));

/** Keys to push. Production overrides applied below. */
const KEYS = [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_RISC_AUDIENCES",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_BOT_USERNAME",
  "TELEGRAM_WEBHOOK_SECRET",
  "APP_ORIGIN",
  "APP_ORIGINS",
  "TOKEN_ENCRYPTION_KEY",
  "CRON_SECRET",
  "INBOUND_EMAIL_DOMAIN",
  "OPENWA_BASE_URL",
  "OPENWA_API_KEY",
  "OPENWA_SESSION_ID",
  "OPENWA_WEBHOOK_SECRET",
  "OPENWA_WA_NUMBER",
];

const productionOverrides = {
  APP_ORIGIN: "https://www.mailmind.me",
  APP_ORIGINS: "http://localhost:5000,https://mailmind.me,https://www.mailmind.me",
  INBOUND_EMAIL_DOMAIN: "mailmind.me",
};

// If RISC audiences empty, still accept Gmail client via GOOGLE_OAUTH_CLIENT_ID in app code.
// Optionally mirror the Gmail client into GOOGLE_RISC_AUDIENCES for Sign-In parity when no extra client.
if (!local.GOOGLE_RISC_AUDIENCES && local.GOOGLE_OAUTH_CLIENT_ID) {
  local.GOOGLE_RISC_AUDIENCES = local.GOOGLE_OAUTH_CLIENT_ID;
}

const sensitiveKeys = new Set([
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "TOKEN_ENCRYPTION_KEY",
  "CRON_SECRET",
  "OPENWA_API_KEY",
  "OPENWA_WEBHOOK_SECRET",
]);

async function upsert(key, value, targets) {
  const response = await fetch(
    `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?upsert=true&teamId=${TEAM_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        value,
        type: sensitiveKeys.has(key) ? "sensitive" : "encrypted",
        target: targets,
      }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${key} → ${response.status}: ${text}`);
  }
  return text;
}

const results = [];
for (const key of KEYS) {
  const value = productionOverrides[key] ?? local[key];
  if (!value) {
    results.push({ key, status: "skipped (empty locally)" });
    continue;
  }
  try {
    await upsert(key, value, ["production", "preview"]);
    results.push({ key, status: "upserted" });
  } catch (error) {
    results.push({
      key,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

for (const row of results) {
  console.log(`${row.key}: ${row.status}${row.error ? ` — ${row.error}` : ""}`);
}

const failed = results.filter((r) => r.status === "failed");
process.exit(failed.length ? 1 : 0);
