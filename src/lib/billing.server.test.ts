import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  planFromSubscriptionStatus,
  verifyStripeWebhookSignature,
} from "./billing.server";

describe("billing helpers", () => {
  it("maps Stripe subscription statuses to Free/Pro", () => {
    expect(planFromSubscriptionStatus("active")).toBe("pro");
    expect(planFromSubscriptionStatus("trialing")).toBe("pro");
    expect(planFromSubscriptionStatus("canceled")).toBe("free");
    expect(planFromSubscriptionStatus("past_due")).toBe("free");
    expect(planFromSubscriptionStatus(null)).toBe("free");
  });

  it("accepts a valid Stripe webhook signature", () => {
    const secret = "whsec_test_secret";
    const payload = JSON.stringify({
      id: "evt_123",
      type: "checkout.session.completed",
      data: { object: { mode: "subscription", metadata: { user_id: "u1" } } },
    });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const v1 = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
    const verified = verifyStripeWebhookSignature(
      payload,
      `t=${timestamp},v1=${v1}`,
      secret,
    );
    expect(verified.eventId).toBe("evt_123");
    expect(verified.type).toBe("checkout.session.completed");
  });

  it("rejects an invalid Stripe webhook signature", () => {
    const payload = JSON.stringify({ id: "evt_1", type: "ping", data: { object: {} } });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    expect(() =>
      verifyStripeWebhookSignature(payload, `t=${timestamp},v1=deadbeef`, "whsec_x"),
    ).toThrow(/Invalid Stripe webhook signature/);
  });
});
