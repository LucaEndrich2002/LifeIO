import { expect, type Page, type Response } from "@playwright/test";

export function documentPolicy(response: Response | null) {
  expect(response).not.toBeNull();
  const policy = response!.headers()["content-security-policy"];
  expect(policy).toBeTruthy();
  if (!policy) throw new Error("Missing document Content-Security-Policy.");
  expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);
  expect(policy).toContain("'strict-dynamic'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(response!.headers()["cache-control"]).toContain("no-store");
  const nonce = policy.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1];
  expect(nonce).toBeTruthy();
  return nonce!;
}

export async function observePolicyViolations(page: Page) {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().startsWith("LifeOS CSP: "))
      violations.push(message.text().slice("LifeOS CSP: ".length));
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      // Record only the violated directive, never document URLs or user data.
      console.error(`LifeOS CSP: ${event.effectiveDirective}`);
    });
  });
  return violations;
}
