#!/usr/bin/env node
/**
 * One-shot registration of Google Cross-Account Protection (RISC) stream.
 *
 * Prerequisites (Google Cloud, same project as OAuth clients):
 * 1. Enable RISC API and accept RISC Terms
 * 2. Create a service account with role roles/riscconfigs.admin
 * 3. Download a JSON key for that service account (keep it local)
 * 4. Deploy MailMind so https://www.mailmind.me/api/public/hooks/risc is live
 *
 * Usage:
 *   set GOOGLE_RISC_SERVICE_ACCOUNT_JSON=C:\path\to\sa.json
 *   node scripts/register-risc-stream.mjs
 *   node scripts/register-risc-stream.mjs --verify
 *
 * Optional:
 *   GOOGLE_RISC_RECEIVER_URL=https://www.mailmind.me/api/public/hooks/risc
 */

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const RECEIVER_URL =
  process.env.GOOGLE_RISC_RECEIVER_URL?.trim() || "https://www.mailmind.me/api/public/hooks/risc";

const EVENTS_REQUESTED = [
  "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
  "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked",
  "https://schemas.openid.net/secevent/oauth/event-type/token-revoked",
  "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
  "https://schemas.openid.net/secevent/risc/event-type/account-enabled",
  "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
  "https://schemas.openid.net/secevent/risc/event-type/verification",
];

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function loadServiceAccount() {
  const path = process.env.GOOGLE_RISC_SERVICE_ACCOUNT_JSON?.trim();
  if (!path) {
    throw new Error(
      "Set GOOGLE_RISC_SERVICE_ACCOUNT_JSON to the local path of the service account JSON key",
    );
  }
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function makeBearerToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: sa.private_key_id };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://risc.googleapis.com/google.identity.risc.v1beta.RiscManagementService",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(sa.private_key);
  return `${unsigned}.${base64url(signature)}`;
}

async function updateStream(authToken) {
  const response = await fetch("https://risc.googleapis.com/v1beta/stream:update", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      delivery: {
        delivery_method: "https://schemas.openid.net/secevent/risc/delivery-method/push",
        url: RECEIVER_URL,
      },
      events_requested: EVENTS_REQUESTED,
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`stream:update failed (${response.status}): ${text}`);
  }
  console.log("Stream configured for", RECEIVER_URL);
  if (text) console.log(text);
}

async function verifyStream(authToken) {
  const state = `mailmind-risc-verify-${Date.now()}`;
  const response = await fetch("https://risc.googleapis.com/v1beta/stream:verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`stream:verify failed (${response.status}): ${text}`);
  }
  console.log("Verification token requested with state:", state);
  console.log("Check Vercel/runtime logs for [risc] verification event");
  if (text) console.log(text);
}

async function main() {
  const verifyOnly = process.argv.includes("--verify");
  const sa = loadServiceAccount();
  const authToken = makeBearerToken(sa);

  if (!verifyOnly) {
    await updateStream(authToken);
  }
  if (verifyOnly || process.argv.includes("--verify-after")) {
    await verifyStream(authToken);
  } else {
    console.log("Tip: run with --verify to send a test verification event");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
