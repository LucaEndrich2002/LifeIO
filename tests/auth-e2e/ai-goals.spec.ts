import { expect, test, type Page } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import {
  createAiPersonal,
  createAiSavings,
} from "../supabase/ai-goals-fixtures";
import { removeFixture } from "../supabase/fixtures";
async function login(
  page: Page,
  user: Awaited<ReturnType<typeof createPlanFixture>>,
) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
}
test("goal overview shows owned facts with local names, fixed sources and disabled live provider", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture({ skipGoal: true }),
    foreign = await createPlanFixture({ skipGoal: true });
  try {
    const savings = await createAiSavings(user);
    await createAiPersonal(user, "Sprache lernen", "2100-12-31");
    await createAiSavings(foreign, "Fremdes Geheimnis");
    await login(page, user);
    await page.goto("/account/ai");
    await page
      .getByRole("link", { name: "Ziele gemeinsam mit Life AI betrachten" })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Deine Ziele mit Life AI" }),
    ).toBeVisible();
    const facts = page.getByRole("region", { name: "Verwendete Zieldaten" });
    await expect(facts).toContainText("Ziel A: Reise");
    await expect(facts).toContainText("Ziel B: Sprache lernen");
    await expect(facts).toContainText("750,00 €");
    await expect(facts).toContainText(
      "Einhaltung des Zieldatums noch nicht einschätzbar",
    );
    await expect(facts).not.toContainText("Fremdes Geheimnis");
    await expect(page.getByRole("checkbox")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Mit OpenAI erklären" }),
    ).toBeDisabled();
    await expect(page.getByRole("status")).toContainText("nicht eingerichtet");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("ai-goals-light.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await page.screenshot({
      path: testInfo.outputPath("ai-goals-dark.png"),
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Ziel A prüfen", exact: true })
      .click();
    await expect(page).toHaveURL(`/account/goals/${savings}`);
    await page.goto("/account/goals");
    await page
      .getByRole("link", { name: "Ziele gemeinsam mit Life AI betrachten" })
      .click();
    await expect(page).toHaveURL("/account/ai/goals");
    await page
      .getByRole("link", { name: "Ziele und Fortschritt im Dashboard prüfen" })
      .click();
    await expect(page).toHaveURL("/account/home?goal_page=0#home-goals");
    await expect(
      page.getByRole("region", { name: "Deine Ziele", exact: true }),
    ).toContainText("Reise");
  } finally {
    await removeFixture(user.id);
    await removeFixture(foreign.id);
  }
});
test("goal overview paginates bounded previews and keeps the source on the selected page", async ({
  page,
}) => {
  const user = await createPlanFixture({ skipGoal: true });
  try {
    await createAiSavings(user);
    for (let index = 1; index <= 6; index++)
      await createAiPersonal(user, `Schritt ${index}`, `2100-01-0${index}`);
    await login(page, user);
    await page.goto("/account/ai/goals");
    const facts = page.getByRole("region", { name: "Verwendete Zieldaten" });
    await expect(facts).toContainText("6 von 7 Zielen");
    await expect(facts).toContainText("Ausschnitt");
    await expect(facts).not.toContainText("Schritt 6");
    await page.getByRole("link", { name: "Nächste Zielseite" }).click();
    await expect(page).toHaveURL("/account/ai/goals?page=1");
    await expect(facts).toContainText("Ziel A: Schritt 6");
    await expect(facts).toContainText("1 von 7 Zielen");
    await expect(facts).not.toContainText("Reise");
    await expect(
      page.getByRole("link", { name: "Nächste Zielseite" }),
    ).toHaveCount(0);
    await page
      .getByRole("link", { name: "Ziele und Fortschritt im Dashboard prüfen" })
      .click();
    await expect(page).toHaveURL("/account/home?goal_page=1#home-goals");
    await expect(
      page.getByRole("region", { name: "Deine Ziele", exact: true }),
    ).toContainText("Schritt 6");
    await page.goto("/account/ai/goals?page=2");
    await expect(
      page.getByRole("heading", { name: "Keine Ziele auf dieser Seite" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Zur ersten Zielseite" }).click();
    await expect(page).toHaveURL("/account/ai/goals?page=0");
    expect(
      (await user.client.from("ai_request_limits").select("*")).data,
    ).toEqual([]);
  } finally {
    await removeFixture(user.id);
  }
});
test("goal overview protects access and explains empty accounts and invalid pages", async ({
  page,
}) => {
  const user = await createPlanFixture({ skipGoal: true }),
    unfinished = await createPlanFixture({ complete: false });
  try {
    await page.goto("/account/ai/goals");
    await expect(page).toHaveURL(/\/auth\/login/);
    await login(page, unfinished);
    await page.goto("/account/ai/goals");
    await expect(page).toHaveURL(/\/account\/onboarding/);
    await page.context().clearCookies();
    await login(page, user);
    await page.goto("/account/ai/goals");
    await expect(
      page.getByRole("heading", { name: "Noch keine Ziele erfasst" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Mit OpenAI erklären" }),
    ).toHaveCount(0);
    await createAiSavings(user, "Nur auf gültigen Seiten sichtbar");
    for (const query of [
      "page=-1",
      "page=1001",
      "page=invalid",
      "page=0&page=1",
    ]) {
      const response = await page.goto(`/account/ai/goals?${query}`);
      // loading.tsx can start streaming before notFound(): Next then keeps 200.
      // https://nextjs.org/docs/app/api-reference/file-conventions/not-found
      expect([200, 404]).toContain(response?.status());
      await expect(
        page.getByRole("heading", { name: "Diese Seite gibt es nicht." }),
      ).toBeVisible();
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
        "content",
        /noindex/,
      );
      await expect(
        page.getByRole("region", { name: "Verwendete Zieldaten" }),
      ).toHaveCount(0);
      await expect(
        page.getByText("Nur auf gültigen Seiten sichtbar"),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Mit OpenAI erklären" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "Zur Startseite", exact: true }),
      ).toHaveAttribute("href", "/");
    }
  } finally {
    await removeFixture(user.id);
    await removeFixture(unfinished.id);
  }
});
