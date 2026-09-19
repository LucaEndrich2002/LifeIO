import { describe, expect, it } from "vitest";
import { parseSupabasePublicEnv } from "./public";

const publicKey = "sb_publishable_abcdefghijklmnopqrstuvwxyz123456";
const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey,
};

function legacyKey(role: string) {
  // Deliberately unsigned test fixture, never a real project credential.
  return `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({ role }))}.test`;
}

describe("Supabase public configuration", () => {
  it("returns only the two public values", () => {
    expect(
      parseSupabasePublicEnv({ ...valid, PRIVATE_VALUE: "must-not-escape" }),
    ).toEqual({
      url: valid.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: publicKey,
    });
  });

  it("supports local development over loopback HTTP", () => {
    expect(
      parseSupabasePublicEnv({
        ...valid,
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      }).url,
    ).toBe("http://127.0.0.1:54321");
  });

  it.each([
    "http://project.supabase.co",
    "ftp://project.supabase.co",
    "not-a-url",
    "https://username:password@project.supabase.co",
    "https://project.supabase.co?secret=value",
  ])("rejects unsafe or malformed URL %s", (url) => {
    expect(() =>
      parseSupabasePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: url }),
    ).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("reports missing configuration without failing at module import", () => {
    expect(() => parseSupabasePublicEnv({})).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it.each([
    "sb_secret_private-key-must-not-escape",
    "sb_publishable_replace_me",
    legacyKey("service_role"),
    "malformed.jwt.value",
  ])(
    "rejects private keys and placeholders without echoing their values",
    (key) => {
      let caught: unknown;
      try {
        parseSupabasePublicEnv({
          ...valid,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(String(caught)).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
      expect(String(caught)).not.toContain(key);
    },
  );

  it("accepts a legacy anon key but does not treat it as a verified user token", () => {
    expect(
      parseSupabasePublicEnv({
        ...valid,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: legacyKey("anon"),
      }).publishableKey,
    ).toBe(legacyKey("anon"));
  });
});
