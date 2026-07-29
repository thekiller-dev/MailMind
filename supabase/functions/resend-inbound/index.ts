import { createClient } from "npm:@supabase/supabase-js@2";
import { Webhook } from "npm:svix";
import { notifyEmailAnalysis } from "../_shared/telegram.ts";

type ResendEvent = {
  type: string;
  data: {
    email_id: string;
    to?: string[];
    received_for?: string[];
  };
};

type ReceivedEmail = {
  id: string;
  from: string;
  to: string[];
  received_for?: string[];
  subject: string;
  text: string | null;
  html: string | null;
  created_at: string;
  message_id: string | null;
};

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function extractAlias(addresses: string[]): string | null {
  for (const address of addresses) {
    const match = address.toLowerCase().match(/\b(mm_[a-f0-9]{32})@/);
    if (match?.[1]) return match[1];
  }
  return null;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function gmailConfirmation(body: string, sender: string, subject: string) {
  const isConfirmation =
    sender.toLowerCase().includes("forwarding-noreply@google.com") ||
    /gmail forwarding confirmation|confirmation du transfert gmail/i.test(subject);
  if (!isConfirmation) return null;

  const code =
    body.match(/(?:confirmation code|code de confirmation)\D{0,30}(\d{6,14})/i)?.[1] ??
    body.match(/\b(\d{9})\b/)?.[1] ??
    null;
  const url =
    body
      .match(/https:\/\/(?:mail-settings\.google\.com|accounts\.google\.com)\/[^\s<>"']+/i)?.[0]
      ?.replace(/&amp;/g, "&") ?? null;
  return { code, url };
}

const categories = new Set([
  "Phishing",
  "Sécurité",
  "Urgent",
  "Finance",
  "Reporting",
  "Commercial",
  "Collaboration",
  "RH",
  "Notification",
  "Autre",
]);

async function analyzeEmail(input: { sender: string; subject: string; body: string }) {
  const apiKey = Deno.env.get("AI_API_KEY");
  if (!apiKey) return null;

  const baseUrl = (Deno.env.get("AI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const authHeader = Deno.env.get("AI_AUTH_HEADER") ?? "Authorization";
  const authPrefix = Deno.env.get("AI_AUTH_PREFIX") ?? "Bearer";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [authHeader]: `${authPrefix} ${apiKey}`.trim(),
    },
    body: JSON.stringify({
      model: Deno.env.get("AI_ANALYSIS_MODEL") ?? "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Tu es MailMind. Réponds uniquement avec un objet JSON contenant summary, category, intent, sentiment, risk_score, risk_reason et entities. category doit être Phishing, Sécurité, Urgent, Finance, Reporting, Commercial, Collaboration, RH, Notification ou Autre. sentiment doit être positif, neutre ou négatif. risk_score est compris entre 0 et 1. entities est une liste de {type,value}.",
        },
        {
          role: "user",
          content: `Expéditeur: ${input.sender}\nSujet: ${input.subject}\n\nCorps:\n${input.body.slice(0, 6000)}`,
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`AI analysis failed: ${response.status}`);
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("AI analysis returned no content");
  const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
  const riskScore = Number(parsed.risk_score);
  return {
    summary: String(parsed.summary ?? "").slice(0, 2000),
    category: categories.has(parsed.category) ? parsed.category : "Autre",
    intent: String(parsed.intent ?? "").slice(0, 500),
    sentiment: ["positif", "neutre", "négatif"].includes(parsed.sentiment)
      ? parsed.sentiment
      : "neutre",
    risk_score: Number.isFinite(riskScore) ? Math.min(Math.max(riskScore, 0), 1) : 0,
    risk_reason: String(parsed.risk_reason ?? "").slice(0, 1000),
    entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 50) : [],
    analyzed_at: new Date().toISOString(),
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 512_000) return json({ ok: false, error: "payload_too_large" }, 413);

  try {
    const payload = await request.text();
    const event = new Webhook(env("RESEND_WEBHOOK_SECRET")).verify(payload, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    }) as ResendEvent;
    if (event.type !== "email.received") return json({ ok: true, ignored: true });

    const resendResponse = await fetch(
      `https://api.resend.com/emails/receiving/${event.data.email_id}?html_format=cid`,
      { headers: { authorization: `Bearer ${env("RESEND_API_KEY")}` } },
    );
    if (!resendResponse.ok) {
      throw new Error(`Resend email retrieval failed: ${resendResponse.status}`);
    }
    const email = (await resendResponse.json()) as ReceivedEmail;
    const alias = extractAlias([
      ...(event.data.to ?? []),
      ...(event.data.received_for ?? []),
      ...(email.to ?? []),
      ...(email.received_for ?? []),
    ]);
    if (!alias) return json({ ok: true, ignored: "unknown recipient" });

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: account, error: accountError } = await supabase
      .from("email_accounts")
      .select("id,user_id")
      .eq("provider", "forwarding")
      .eq("inbound_alias", alias)
      .single();
    if (accountError || !account) return json({ ok: true, ignored: "inactive recipient" });

    const body = (email.text?.trim() || htmlToText(email.html ?? "")).slice(0, 8000);
    const confirmation = gmailConfirmation(body, email.from, email.subject);
    if (confirmation) {
      const { error } = await supabase
        .from("email_accounts")
        .update({
          forwarding_confirmation_code: confirmation.code,
          forwarding_confirmation_url: confirmation.url,
          status: "pending_confirmation",
          error: confirmation.code || confirmation.url ? null : "confirmation_details_not_found",
        })
        .eq("id", account.id);
      if (error) throw error;
      return json({ ok: true, confirmation: true });
    }

    const providerMessageId = `resend:${email.id}`;
    const { data: existing } = await supabase
      .from("emails")
      .select("id,analyzed_at")
      .eq("account_id", account.id)
      .eq("provider_message_id", providerMessageId)
      .maybeSingle();

    let emailId = existing?.id;
    if (!emailId) {
      const { data: inserted, error } = await supabase
        .from("emails")
        .insert({
          user_id: account.user_id,
          account_id: account.id,
          provider_message_id: providerMessageId,
          thread_id: email.message_id,
          sender: email.from || "unknown",
          subject: email.subject || "(sans objet)",
          body,
          snippet: body.slice(0, 300),
          received_at: email.created_at,
        })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") return json({ ok: true, duplicate: true });
        throw error;
      }
      emailId = inserted.id;
    }

    await supabase
      .from("email_accounts")
      .update({
        status: "connected",
        last_forwarded_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", account.id);

    if (!existing?.analyzed_at) {
      try {
        const analysis = await analyzeEmail({
          sender: email.from,
          subject: email.subject,
          body,
        });
        if (analysis && emailId) {
          await supabase.from("emails").update(analysis).eq("id", emailId);
          try {
            await notifyEmailAnalysis(supabase, account.user_id, {
              id: emailId,
              sender: email.from,
              subject: email.subject,
              summary: analysis.summary,
              category: analysis.category,
              risk_score: analysis.risk_score,
              risk_reason: analysis.risk_reason,
            });
          } catch (notificationError) {
            console.error("telegram notification failed", notificationError);
          }
        }
      } catch (error) {
        console.error("inbound analysis failed", error);
      }
    }

    return json({ ok: true, emailId });
  } catch (error) {
    console.error("resend inbound webhook failed", error);
    return json({ ok: false, error: "webhook_failed" }, 400);
  }
});
