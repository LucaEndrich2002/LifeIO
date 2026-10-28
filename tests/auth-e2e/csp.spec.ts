import { expect, test } from "@playwright/test";
import { documentPolicy, observePolicyViolations } from "../csp";
import { createFixture, removeFixture } from "../supabase/fixtures";

test("policy remains compatible with preview, sign-in, saved profile and logout navigation", async ({
  page,
}) => {
  const fixture = await createFixture();
  const violations = await observePolicyViolations(page);
  try {
    await page.emulateMedia({ colorScheme: "light" });
    documentPolicy(await page.goto("/"));
    await page.getByRole("link", { name: "Mein Konto", exact: true }).click();
    await expect(page).toHaveURL("/auth/login");
    await page.getByLabel("E-Mail-Adresse").fill(fixture.email);
    await page.getByLabel("Passwort", { exact: true }).fill(fixture.password);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page).toHaveURL("/account");
    await page.getByLabel("Anzeigename").fill("CSP Beispiel");
    await page.getByRole("button", { name: "Profil speichern" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Dein Profil wurde gespeichert.",
    );
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    const nonce = documentPolicy(await page.reload());
    expect(
      await page
        .locator("script")
        .evaluateAll((scripts) =>
          scripts.every((script) => script.nonce !== ""),
        ),
    ).toBe(true);
    expect(
      await page
        .locator("script")
        .first()
        .evaluate((script) => script.nonce),
    ).toBe(nonce);
    await expect(page.getByLabel("Anzeigename")).toHaveValue("CSP Beispiel");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Abmelden", exact: true }).click();
    await expect(page).toHaveURL("/auth/login");
    await page
      .getByRole("link", { name: "Zur Dashboard-Vorschau", exact: true })
      .click();
    await expect(page).toHaveURL("/");
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await expect(page.locator("html")).toHaveClass(/light/);
    expect(violations).toEqual([]);
  } finally {
    await removeFixture(fixture.id);
  }
});
