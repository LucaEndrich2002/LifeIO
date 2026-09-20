import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema, verificationSchema } from "@/domain/auth";

describe("account input validation", () => {
  it("normalizes email addresses without changing passwords", () => {
    expect(
      signupSchema.parse({
        email: " Person@Example.test ",
        password: "  long password  ",
      }),
    ).toEqual({ email: "person@example.test", password: "  long password  " });
  });
  it.each(["short", "x".repeat(129)])(
    "rejects passwords outside the supported length",
    (password) => {
      expect(
        signupSchema.safeParse({ email: "person@example.test", password })
          .success,
      ).toBe(false);
    },
  );
  it("does not apply a new-password rule to a login attempt", () => {
    expect(
      loginSchema.safeParse({ email: "person@example.test", password: "old" })
        .success,
    ).toBe(true);
  });
  it.each(["12345", "1234567", "1e0000", "abcdef"])(
    "rejects malformed verification codes",
    (token) => {
      expect(
        verificationSchema.safeParse({ email: "person@example.test", token })
          .success,
      ).toBe(false);
    },
  );
  it("preserves leading zeroes in a verification code", () => {
    expect(
      verificationSchema.parse({
        email: "person@example.test",
        token: "012345",
      }).token,
    ).toBe("012345");
  });
});
