import { expect, test } from "@playwright/test";

test("all five areas are reachable and distinguish the preview from real data", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Dein Tag, mit Überblick.",
  );
  await expect(page.getByRole("contentinfo")).toContainText(
    "speichert noch keine persönlichen Daten",
  );

  for (const [label, path, title] of [
    ["Money", "/money", "Dein Geld, gut sortiert."],
    ["Plan", "/plan", "Platz für das Wesentliche."],
    ["Goals", "/goals", "Aus Wünschen werden Ziele."],
    ["AI", "/ai", "Dein Alltag im Zusammenhang."],
  ] as const) {
    await page
      .getByRole("navigation", { name: "Hauptnavigation" })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    if (label === "Money") {
      await expect(
        page.getByRole("link", { name: "Private Finanzübersicht öffnen" }),
      ).toHaveAttribute("href", "/account/money");
    } else if (label === "Goals") {
      await expect(
        page.getByRole("link", { name: "Private Ziele öffnen" }),
      ).toHaveAttribute("href", "/account/goals");
    } else {
      await expect(
        page.getByText("In Vorbereitung", { exact: true }),
      ).toBeVisible();
    }
    await expect(page.locator('nav a[aria-current="page"]')).toHaveText(label);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  }

  await page.getByRole("link", { name: "Zum Überblick" }).click();
  await expect(page.locator('nav a[aria-current="page"]')).toHaveText("Home");
  expect(errors).toEqual([]);
});

test("theme can be switched and survives a reload without horizontal overflow", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.screenshot({
    path: testInfo.outputPath("home-light.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Farbschema wechseln" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("home-dark.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Farbschema wechseln" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
});

test("keyboard users can skip the navigation", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Zum Inhalt springen" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("unknown routes return an actual 404 with a working way home", async ({
  page,
}) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Diese Seite gibt es nicht.",
  );
  await page.getByRole("link", { name: "Zur Startseite", exact: true }).click();
  await expect(page).toHaveURL("/");
});
