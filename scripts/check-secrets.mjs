#!/usr/bin/env node
/**
 * Local / CI guardrails for secret strength and accidental plaintext leakage.
 * Does not rotate secrets — it only fails when configuration is unsafe.
 *
 * Usage: node scripts/check-secrets.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const MIN_LEN = {
  TOKEN_ENCRYPTION_KEY: 32,
  CRON_SECRET: 24,
  STRIPE_WEBHOOK_SECRET: 16,
  TELEGRAM_WEBHOOK_SECRET: 16,
  OPENWA_WEBHOOK_SECRET: 16,
  RESEND_WEBHOOK_SECRET: 16,
};

const REQUIRED_IN_PRODUCTION = [
  "TOKEN_ENCRYPTION_KEY",
  "CRON_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = {
  ...loadEnvFile(resolve(process.cwd(), ".env")),
  ...process.env,
};

const errors = [];
const warnings = [];

for (const [key, min] of Object.entries(MIN_LEN)) {
  const value = env[key];
  if (!value) continue;
  if (value.length < min) {
    errors.push(`${key} too short (min ${min} chars)`);
  }
  if (/^(change.?me|secret|password|test|xxx)/i.test(value)) {
    errors.push(`${key} looks like a placeholder`);
  }
}

if (env.APP_ORIGIN?.includes("mailmind.me") || env.VERCEL_ENV === "production") {
  for (const key of REQUIRED_IN_PRODUCTION) {
    if (!env[key]) errors.push(`Missing required production secret: ${key}`);
  }
  if (!env.STRIPE_SECRET_KEY) {
    warnings.push("STRIPE_SECRET_KEY missing — Pro checkout disabled");
  }
}

if (existsSync(resolve(process.cwd(), ".env")) === false) {
  warnings.push(".env not found (ok in CI if secrets come from the platform)");
}

for (const w of warnings) console.warn(`warn: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  process.exit(1);
}

console.log("check-secrets: ok");
