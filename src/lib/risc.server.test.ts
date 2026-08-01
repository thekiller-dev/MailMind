import { describe, expect, it } from "vitest";
import { extractTokenFromRequestBody, resolveRiscAudiences } from "./risc.server";

describe("extractTokenFromRequestBody", () => {
  it("accepts a raw JWT", () => {
    const jwt = "aaa.bbb.ccc";
    expect(extractTokenFromRequestBody(jwt, "text/plain")).toBe(jwt);
  });

  it("accepts JSON-wrapped token", () => {
    const jwt = "aaa.bbb.ccc";
    expect(extractTokenFromRequestBody(JSON.stringify({ token: jwt }), "application/json")).toBe(
      jwt,
    );
  });

  it("rejects empty body", () => {
    expect(() => extractTokenFromRequestBody("  ", null)).toThrow(/Empty body/);
  });
});

describe("resolveRiscAudiences", () => {
  it("merges primary client id and extra audiences", () => {
    const prevPrimary = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const prevExtra = process.env.GOOGLE_RISC_AUDIENCES;
    process.env.GOOGLE_OAUTH_CLIENT_ID = "client-a.apps.googleusercontent.com";
    process.env.GOOGLE_RISC_AUDIENCES =
      "client-b.apps.googleusercontent.com, client-a.apps.googleusercontent.com";
    expect(resolveRiscAudiences()).toEqual([
      "client-a.apps.googleusercontent.com",
      "client-b.apps.googleusercontent.com",
    ]);
    process.env.GOOGLE_OAUTH_CLIENT_ID = prevPrimary;
    process.env.GOOGLE_RISC_AUDIENCES = prevExtra;
  });
});
