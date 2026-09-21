import { expect, test } from "@playwright/test";

test("example dashboard makes its data source and goal progress clear", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Alle gezeigten Daten sind fiktiv.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Beispieldaten", pressed: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: "Beispiel-Tagesplan" })
      .getByRole("listitem"),
  ).toHaveCount(3);
  await expect(
    page.getByText("Beispieltag · Samstag, 19. September 2026"),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Fortschritt: Notgroschen" }),
  ).toHaveAttribute("value", "60");
  await expect(
    page.getByRole("progressbar", { name: "Fortschritt: Auszeit am Meer" }),
  ).toHaveAttribute("value", "70");
  await expect(
    page.getByText("Er ist kein Kontostand", { exact: false }),
  ).toBeVisible();
  for (const [label, path] of [
    ["Plan ansehen", "/plan"],
    ["Goals ansehen", "/goals"],
    ["Money ansehen", "/money"],
  ] as const) {
    await page.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(path);
    if (path === "/money") {
      await expect(
        page.getByRole("link", { name: "Private Finanzübersicht öffnen" }),
      ).toHaveAttribute("href", "/account/money");
    } else {
      await expect(
        page.getByText("In Vorbereitung", { exact: true }),
      ).toBeVisible();
    }
    await page.getByRole("link", { name: "Zum Überblick" }).click();
  }
});

test("empty preview removes sample values and remains operable by keyboard", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const emptyButton = page.getByRole("button", { name: "Ohne Einträge" });
  await emptyButton.focus();
  await page.keyboard.press("Enter");
  await expect(emptyButton).toHaveAttribute("aria-pressed", "true");
  await expect(emptyButton).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Dein Überblick beginnt mit dir." }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByText("820,00 €", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Noch kein Monatsüberblick", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText("0,00 €");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("home-empty.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Money entdecken" }).click();
  await expect(page).toHaveURL("/money");
  await page.getByRole("link", { name: "Zum Überblick" }).click();
  await page.getByRole("button", { name: "Ohne Einträge" }).click();
  const exampleButton = page.getByRole("button", { name: "Beispieldaten" });
  await exampleButton.focus();
  await page.keyboard.press("Space");
  await expect(exampleButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("820,00 €", { exact: true })).toBeVisible();
});
