import { describe, expect, it } from "vitest";
import { minimizeEmailForAi } from "./data-minimization";

describe("minimizeEmailForAi", () => {
  it("redacts credentials and sensitive URL parameters", () => {
    const result = minimizeEmailForAi({
      sender: "service@example.com",
      subject: "API key=super-secret-value",
      body: "Authorization: Bearer abcdefghijklmnopqrstuvwxyz https://x.test?a=1&token=raw-token",
    });

    expect(result.subject).not.toContain("super-secret-value");
    expect(result.body).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(result.body).not.toContain("raw-token");
    expect(result.body).toContain("[REDACTED]");
  });

  it("redacts IBAN and payment card patterns", () => {
    const result = minimizeEmailForAi({
      sender: "billing@example.com",
      subject: "Paiement",
      body: "FR76 3000 6000 0112 3456 7890 189 et 4111 1111 1111 1111",
    });

    expect(result.body).toContain("[IBAN REDACTED]");
    expect(result.body).toContain("[PAYMENT CARD REDACTED]");
  });

  it("caps the configured body size", () => {
    const result = minimizeEmailForAi({ sender: "a", subject: "b", body: "x".repeat(9000) }, 600);

    expect(result.body).toHaveLength(600);
  });
});
