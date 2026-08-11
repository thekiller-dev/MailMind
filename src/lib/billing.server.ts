import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { UserPlan } from "./plan.server";

type DatabaseClient = SupabaseClient<Database>;

const STRIPE_API = "https://api.stripe.com/v1";

export class BillingConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingConfigError";
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRICE_PRO?.trim(),
  );
}

function requireStripeSecret(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new BillingConfigError("Stripe n'est pas configuré (STRIPE_SECRET_KEY).");
  return key;
}

function requirePricePro(): string {
  const price = process.env.STRIPE_PRICE_PRO?.trim();
  if (!price) throw new BillingConfigError("Stripe n'est pas configuré (STRIPE_PRICE_PRO).");
  return price;
}

function appOrigin(): string {
  const origin = (process.env.APP_ORIGIN ?? "https://www.mailmind.me").replace(/\/$/, "");
  return origin;
}

async function stripeForm(
  path: string,
  body: Record<string, string>,
  method: "POST" | "GET" = "POST",
): Promise<Record<string, unknown>> {
  const secret = requireStripeSecret();
  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : new URLSearchParams(body).toString(),
  });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof json.error === "object" &&
      json.error &&
      "message" in json.error &&
      typeof (json.error as { message?: unknown }).message === "string"
        ? (json.error as { message: string }).message
        : `Stripe API error ${response.status}`;
    throw new Error(message);
  }
  return json;
}

export function planFromSubscriptionStatus(status: string | null | undefined): UserPlan {
  return status === "active" || status === "trialing" ? "pro" : "free";
}

/** Verify Stripe-Signature header (t=…,v1=…). */
export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): { eventId: string; type: string; dataObject: Record<string, unknown> } {
  if (!signatureHeader) throw new Error("Missing Stripe-Signature");
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [k, ...rest] = part.trim().split("=");
      return [k, rest.join("=")];
    }),
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) throw new Error("Invalid Stripe-Signature");

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    throw new Error("Stripe webhook timestamp outside tolerance");
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid Stripe webhook signature");
  }

  const event = JSON.parse(rawBody) as {
    id?: string;
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  if (!event.id || !event.type) throw new Error("Invalid Stripe event payload");
  return {
    eventId: event.id,
    type: event.type,
    dataObject: event.data?.object ?? {},
  };
}

export async function ensureStripeCustomer(
  supabase: DatabaseClient,
  input: { userId: string; email: string | null },
): Promise<string> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id,email")
    .eq("id", input.userId)
    .maybeSingle();
  if (error) throw error;
  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await stripeForm("/customers", {
    email: input.email ?? profile?.email ?? "",
    "metadata[user_id]": input.userId,
  });
  const customerId = String(customer.id);
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", input.userId);
  if (updateError) throw updateError;
  return customerId;
}

export async function createProCheckoutSession(
  supabase: DatabaseClient,
  input: { userId: string; email: string | null },
): Promise<{ url: string }> {
  if (!isStripeConfigured()) {
    throw new BillingConfigError(
      "Le paiement Stripe n'est pas encore activé. Contactez le support MailMind.",
    );
  }
  const customerId = await ensureStripeCustomer(supabase, input);
  const origin = appOrigin();
  const session = await stripeForm("/checkout/sessions", {
    mode: "subscription",
    customer: customerId,
    client_reference_id: input.userId,
    "line_items[0][price]": requirePricePro(),
    "line_items[0][quantity]": "1",
    success_url: `${origin}/settings?billing=success`,
    cancel_url: `${origin}/pricing?billing=cancel`,
    "subscription_data[metadata][user_id]": input.userId,
    "metadata[user_id]": input.userId,
  });
  const url = typeof session.url === "string" ? session.url : null;
  if (!url) throw new Error("Stripe checkout session sans URL");
  return { url };
}

export async function createBillingPortalSession(
  supabase: DatabaseClient,
  input: { userId: string; email: string | null },
): Promise<{ url: string }> {
  if (!isStripeConfigured()) {
    throw new BillingConfigError("Le portail Stripe n'est pas configuré.");
  }
  const customerId = await ensureStripeCustomer(supabase, input);
  const session = await stripeForm("/billing_portal/sessions", {
    customer: customerId,
    return_url: `${appOrigin()}/settings`,
  });
  const url = typeof session.url === "string" ? session.url : null;
  if (!url) throw new Error("Stripe portal session sans URL");
  return { url };
}

async function resolveUserIdFromStripeObject(
  supabase: DatabaseClient,
  obj: Record<string, unknown>,
): Promise<string | null> {
  const metadata = obj.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const userId = (metadata as Record<string, unknown>).user_id;
    if (typeof userId === "string" && userId.length > 0) return userId;
  }
  if (typeof obj.client_reference_id === "string" && obj.client_reference_id) {
    return obj.client_reference_id;
  }
  const customerId =
    typeof obj.customer === "string"
      ? obj.customer
      : typeof obj.id === "string" && String(obj.object) === "customer"
        ? obj.id
        : null;
  if (!customerId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function applySubscriptionToProfile(
  supabase: DatabaseClient,
  input: {
    userId: string;
    customerId?: string | null;
    subscriptionId?: string | null;
    status?: string | null;
  },
): Promise<UserPlan> {
  const plan = planFromSubscriptionStatus(input.status);
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {
    plan,
    updated_at: new Date().toISOString(),
  };
  if (input.customerId) patch.stripe_customer_id = input.customerId;
  if (input.subscriptionId !== undefined) {
    patch.stripe_subscription_id = input.subscriptionId;
  }
  if (input.status !== undefined) {
    patch.stripe_subscription_status = input.status;
  }
  const { error } = await supabase.from("profiles").update(patch).eq("id", input.userId);
  if (error) throw error;
  return plan;
}

export async function handleStripeWebhookEvent(
  supabase: DatabaseClient,
  input: {
    eventId: string;
    type: string;
    dataObject: Record<string, unknown>;
  },
): Promise<{ duplicate: boolean; userId: string | null; plan: UserPlan | null }> {
  const { error: insertError } = await supabase.from("stripe_webhook_events").insert({
    event_id: input.eventId,
    event_type: input.type,
    payload: input.dataObject as Json,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return { duplicate: true, userId: null, plan: null };
    }
    throw insertError;
  }

  const obj = input.dataObject;
  const userId = await resolveUserIdFromStripeObject(supabase, obj);

  if (
    input.type === "checkout.session.completed" &&
    obj.mode === "subscription" &&
    userId
  ) {
    const subscriptionId =
      typeof obj.subscription === "string" ? obj.subscription : null;
    const customerId = typeof obj.customer === "string" ? obj.customer : null;
    const plan = await applySubscriptionToProfile(supabase, {
      userId,
      customerId,
      subscriptionId,
      status: "active",
    });
    return { duplicate: false, userId, plan };
  }

  if (
    (input.type === "customer.subscription.updated" ||
      input.type === "customer.subscription.deleted") &&
    userId
  ) {
    const status =
      input.type === "customer.subscription.deleted"
        ? "canceled"
        : typeof obj.status === "string"
          ? obj.status
          : "canceled";
    const plan = await applySubscriptionToProfile(supabase, {
      userId,
      customerId: typeof obj.customer === "string" ? obj.customer : null,
      subscriptionId: typeof obj.id === "string" ? obj.id : null,
      status,
    });
    return { duplicate: false, userId, plan };
  }

  return { duplicate: false, userId, plan: null };
}
