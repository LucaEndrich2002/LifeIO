import { expect, test } from "@playwright/test";
import {
  createFixture,
  fixtureCredentials,
  mailCode,
  removeFixture,
  removeFixtureByEmail,
} from "../supabase/fixtures";

test("a stale session is refreshed without losing the signed-in account", async ({
  page,
  context,
}) => {
  const fixture = await createFixture();
  try {
    await page.goto("/auth/login");
    await page.getByLabel("E-Mail-Adresse").fill(fixture.email);
    await page.getByLabel("Passwort", { exact: true }).fill(fixture.password);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page).toHaveURL("/account");
    const chunks = (await context.cookies())
      .filter((cookie) => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    const first = chunks[0];
    if (!first) throw new Error("Expected session cookies after sign-in.");
    const name = first.name.replace(/\.\d+$/, "");
    const session = JSON.parse(
      Buffer.from(
        chunks
          .map((cookie) => cookie.value)
          .join("")
          .slice(7),
        "base64url",
      ).toString("utf8"),
    ) as { expires_at: number };
    session.expires_at = 1;
    const stale =
      "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
    await context.clearCookies({ name: /^sb-.+-auth-token(?:\.\d+)?$/ });
    const pieces = stale.match(/.{1,3000}/g) ?? [];
    await context.addCookies(
      pieces.map((value, index) => ({
        ...first,
        name: pieces.length === 1 ? name : `${name}.${index}`,
        value,
      })),
    );
    const response = await page.goto("/account");
    await expect(page).toHaveURL("/account");
    await expect(page.getByLabel("Anzeigename")).toBeVisible();
    expect(response?.headers()["cache-control"]).toContain("no-store");
    const refreshed = (await context.cookies())
      .filter((cookie) => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    const refreshedSession = JSON.parse(
      Buffer.from(
        refreshed
          .map((cookie) => cookie.value)
          .join("")
          .slice(7),
        "base64url",
      ).toString("utf8"),
    ) as { expires_at: number };
    expect(refreshedSession.expires_at).toBeGreaterThan(
      Math.floor(Date.now() / 1000),
    );
    await page.reload();
    await expect(page).toHaveURL("/account");
  } finally {
    await removeFixture(fixture.id);
  }
});

test("registration, email confirmation, profile persistence and logout", async ({
  page,
}, testInfo) => {
  const credentials = fixtureCredentials();
  try {
    await page.goto("/auth/signup");
    await page.getByLabel("E-Mail-Adresse").fill(credentials.email);
    await page
      .getByLabel("Passwort", { exact: true })
      .fill(credentials.password);
    await page
      .getByRole("button", { name: "Konto erstellen", exact: true })
      .click();
    await expect(page).toHaveURL("/auth/confirm");
    await page.goto("/account");
    await expect(page).toHaveURL("/auth/login");
    await page.goto("/auth/confirm");
    await page.getByLabel("E-Mail-Adresse").fill(credentials.email);
    await page
      .getByLabel("Bestätigungscode")
      .fill(await mailCode(credentials.email, "Bestätige dein LifeOS-Konto"));
    await page
      .getByRole("button", { name: "E-Mail bestätigen", exact: true })
      .click();
    await expect(page).toHaveURL("/account");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Richte dein Profil ein.",
    );
    await page.getByLabel("Anzeigename").fill("Alex Beispiel");
    await page.getByLabel("Zeitzone").selectOption("America/New_York");
    await page.getByRole("button", { name: "Profil speichern" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Dein Profil wurde gespeichert.",
    );
    await page.reload();
    await expect(page.getByLabel("Anzeigename")).toHaveValue("Alex Beispiel");
    await expect(page.getByLabel("Zeitzone")).toHaveValue("America/New_York");
    await page.getByRole("button", { name: "Profil speichern" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Dein Profil wurde gespeichert.",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("profile.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Abmelden", exact: true }).click();
    await expect(page).toHaveURL("/auth/login");
    await page.goto("/account");
    await expect(page).toHaveURL("/auth/login");
    await page.getByLabel("E-Mail-Adresse").fill(credentials.email);
    await page
      .getByLabel("Passwort", { exact: true })
      .fill(credentials.password);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page).toHaveURL("/account");
    await expect(page.getByLabel("Anzeigename")).toHaveValue("Alex Beispiel");
  } finally {
    await removeFixtureByEmail(credentials.email);
  }
});

test("password recovery requires a valid one-time code", async ({ page }) => {
  const fixture = await createFixture();
  try {
    await page.goto("/account/password");
    await expect(page).toHaveURL("/auth/login");
    await page.getByRole("link", { name: "Passwort vergessen?" }).click();
    await expect(page).toHaveURL("/auth/recover");
    await page.getByLabel("E-Mail-Adresse").fill(fixture.email);
    await page.getByRole("button", { name: "Code anfordern" }).click();
    await expect(page).toHaveURL("/auth/recovery");
    const code = await mailCode(
      fixture.email,
      "Dein Code für ein neues LifeOS-Passwort",
    );
    await page.getByLabel("E-Mail-Adresse").fill(fixture.email);
    await page
      .getByLabel("Bestätigungscode")
      .fill(code === "000000" ? "111111" : "000000");
    await page.getByRole("button", { name: "Code prüfen" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "ungültig oder abgelaufen",
    );
    await expect(page.getByLabel("E-Mail-Adresse")).toHaveValue(fixture.email);
    await page.getByLabel("Bestätigungscode").fill(code);
    await page.getByRole("button", { name: "Code prüfen" }).click();
    await expect(page).toHaveURL("/account/password");
    const newPassword = `${fixture.password}-new`;
    await page.getByLabel("Neues Passwort").fill(newPassword);
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(page).toHaveURL("/account?notice=password-updated");
    await page.getByRole("button", { name: "Abmelden", exact: true }).click();
    await page.getByLabel("E-Mail-Adresse").fill(fixture.email);
    await page.getByLabel("Passwort", { exact: true }).fill(fixture.password);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Anmeldung fehlgeschlagen",
    );
    await page.getByLabel("Passwort", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page).toHaveURL("/account");
  } finally {
    await removeFixture(fixture.id);
  }
});

test("anonymous and forged-session requests cannot read private data", async ({
  page,
  context,
}, testInfo) => {
  await context.addCookies([
    {
      name: "sb-127-auth-token",
      value:
        "base64-" +
        Buffer.from(
          JSON.stringify({
            access_token: [
              Buffer.from(
                JSON.stringify({ alg: "HS256", typ: "JWT" }),
              ).toString("base64url"),
              Buffer.from(
                JSON.stringify({
                  sub: "00000000-0000-0000-0000-000000000001",
                  exp: Math.floor(Date.now() / 1000) + 3600,
                }),
              ).toString("base64url"),
              "invalid-test-signature",
            ].join("."),
            refresh_token: "invalid-test-refresh",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { id: "00000000-0000-0000-0000-000000000001" },
          }),
        ).toString("base64url"),
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  const response = await page.goto("/account");
  await expect(page).toHaveURL("/auth/login");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(page.getByLabel("Anzeigename")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Zum Inhalt springen" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("login-light.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Farbschema wechseln" }).click();
  await page.screenshot({
    path: testInfo.outputPath("login-dark.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
