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
 *
 * Note: we embed `?secret=` in the webhook URL because some Kappelas
 * deliveries omit the X-Webhook-Secret header.
 */

import { KappelaBot } from "@kappelas/sdk";

const token = process.env.KAPPELAS_BOT_TOKEN?.trim();
const secret = process.env.KAPPELAS_WEBHOOK_SECRET?.trim();
const baseUrl =
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
  const redacted =
    info && typeof info === "object"
      ? {
          ...info,
          url:
            typeof info.url === "string" && secret
              ? info.url.replaceAll(secret, "***")
              : info.url,
        }
      : info;
  console.log(JSON.stringify(redacted, null, 2));
  process.exit(0);
}

if (!secret) {
  console.error("Missing KAPPELAS_WEBHOOK_SECRET");
  process.exit(1);
}

const url = new URL(baseUrl.split("?")[0]);
url.searchParams.set("secret", secret);
const webhookUrl = url.toString();

const result = await bot.webhooks.set({ url: webhookUrl, secret });
console.log("Webhook registered:", result);
const info = await bot.webhooks.getInfo();
console.log("Current webhook:", {
  ...info,
  // Avoid dumping the secret in logs if the API echoes the full URL.
  url: typeof info?.url === "string" ? info.url.replace(secret, "***") : info?.url,
});
