import { describe, expect, it } from "vitest";
import { maxEmailAccounts, type UserPlan } from "./plan.server";

describe("maxEmailAccounts", () => {
  it("limits free plan to 1 account", () => {
    expect(maxEmailAccounts("free")).toBe(1);
  });

  it("allows 5 accounts on pro", () => {
    expect(maxEmailAccounts("pro")).toBe(5);
  });

  it("treats only free and pro as known plans", () => {
    const plans: UserPlan[] = ["free", "pro"];
    expect(plans.map(maxEmailAccounts)).toEqual([1, 5]);
  });
});
