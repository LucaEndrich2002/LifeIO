// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  environment: vi.fn(),
  claims: vi.fn(),
}));
vi.mock("@/lib/env/public", () => ({
  getSupabasePublicEnv: mocks.environment,
}));
type CookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (
    items: { name: string; value: string; options: CookieOptions }[],
    headers: Record<string, string>,
  ) => void;
};
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: CookieAdapter },
  ) => ({
    auth: { getClaims: () => mocks.claims(options.cookies) },
  }),
}));
import { proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());

describe("browser policy and session proxy", () => {
  it("replaces caller-supplied policy/nonce and gives each response a fresh nonce", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = () =>
      new NextRequest("http://localhost:3000/", {
        headers: {
          "x-nonce": "attacker",
          "Content-Security-Policy": "default-src *",
        },
      });
    const first = await proxy(request());
    const second = await proxy(request());
    const nonce = first.headers.get("x-middleware-request-x-nonce")!;
    const policy = first.headers.get("Content-Security-Policy")!;
    expect(Buffer.from(nonce, "base64")).toHaveLength(32);
    expect(second.headers.get("x-middleware-request-x-nonce")).not.toBe(nonce);
    expect(policy).toContain(`'nonce-${nonce}'`);
    expect(
      first.headers.get("x-middleware-request-content-security-policy"),
    ).toBe(policy);
    expect(policy).not.toMatch(/attacker|unsafe-inline|unsafe-eval|ws:|\*/);
    expect(first.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.environment).not.toHaveBeenCalled();
    expect(mocks.claims).not.toHaveBeenCalled();
  });

  it("limits hot-reload exceptions to development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await proxy(new NextRequest("http://localhost:3000/"));
    const policy = response.headers.get("Content-Security-Policy")!;
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain("ws://127.0.0.1:*");
    expect(policy).toContain("script-src-attr 'none'");
  });

  it("keeps fresh request cookies, response cookies and security headers on repeated refresh", async () => {
    mocks.environment.mockReturnValue({
      url: "http://localhost:54321",
      publishableKey: "test",
    });
    mocks.claims.mockImplementationOnce(async (cookies: CookieAdapter) => {
      cookies.setAll(
        [{ name: "session", value: "refreshed", options: { httpOnly: true } }],
        {},
      );
      expect(cookies.getAll()).toContainEqual({
        name: "session",
        value: "refreshed",
      });
      cookies.setAll(
        [
          {
            name: "session-part",
            value: "second",
            options: { httpOnly: true },
          },
        ],
        {
          "Cache-Control": "public, max-age=3600",
          "Referrer-Policy": "unsafe-url",
          "Content-Security-Policy": "default-src *",
        },
      );
    });
    const response = await proxy(
      new NextRequest("http://localhost:3000/account", {
        headers: { Cookie: "session=old" },
      }),
    );
    expect(mocks.claims).toHaveBeenCalledOnce();
    expect(response.cookies.get("session")?.value).toBe("refreshed");
    expect(response.cookies.get("session-part")?.value).toBe("second");
    expect(response.headers.get("x-middleware-request-cookie")).toBe(
      "session=refreshed; session-part=second",
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      response.headers.get("x-middleware-request-content-security-policy"),
    );
  });

  it.each(["/auth/login", "/account/home"])(
    "refreshes identity only for the private boundary %s",
    async (path) => {
      mocks.environment.mockReturnValue({
        url: "http://localhost:54321",
        publishableKey: "test",
      });
      await proxy(new NextRequest(`http://localhost:3000${path}`));
      expect(mocks.claims).toHaveBeenCalledOnce();
    },
  );

  it.each(["/", "/accounting", "/author", "/does-not-exist"])(
    "keeps %s independent of auth configuration",
    async (path) => {
      await proxy(new NextRequest(`http://localhost:3000${path}`));
      expect(mocks.environment).not.toHaveBeenCalled();
      expect(mocks.claims).not.toHaveBeenCalled();
    },
  );
});
