#!/usr/bin/env node
/**
 * Register (or verify) the Kappelas bot webhook pointing at MailMind.
 *
 * Env:
 *   KAPPELAS_BOT_TOKEN
 *   KAPPELAS_WEBHOOK_SECRET
 *   KAPPELAS_WEBHOOK_URL (default https://www.mailmind.me/api/public/hooks/kappelas)
 *   APP_ORIGIN (fallback for URL)
 *
 * Usage:
 *   node scripts/register-kappelas-webhook.mjs
 *   node scripts/register-kappelas-webhook.mjs --verify
 */

import { KappelaBot } from "@kappelas/sdk";

const token = process.env.KAPPELAS_BOT_TOKEN?.trim();
const secret = process.env.KAPPELAS_WEBHOOK_SECRET?.trim();
const url =
  process.env.KAPPELAS_WEBHOOK_URL?.trim() ||
  `${(process.env.APP_ORIGIN ?? "https://www.mailmind.me").replace(/\/$/, "")}/api/public/hooks/kappelas`;

if (!token) {
  console.error("Missing KAPPELAS_BOT_TOKEN");
  process.exit(1);
}

const bot = new KappelaBot({ token });
const verifyOnly = process.argv.includes("--verify");

if (verifyOnly) {
  const info = await bot.webhooks.getInfo();
  console.log(JSON.stringify(info, null, 2));
  process.exit(0);
}

if (!secret) {
  console.error("Missing KAPPELAS_WEBHOOK_SECRET (sent as X-Webhook-Secret)");
  process.exit(1);
}

const result = await bot.webhooks.set({ url, secret });
console.log("Webhook registered:", result);
const info = await bot.webhooks.getInfo();
console.log("Current webhook:", info);
