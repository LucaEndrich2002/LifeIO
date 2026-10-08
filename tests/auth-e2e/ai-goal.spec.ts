import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { financialLinkGoal, createLinkGoal } from "../supabase/link-fixtures";
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
test("goal explanation has actual projection, explicit consent and source navigation without a provider", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture();
  try {
    await login(page, user);
    await page.goto("/account/ai");
    await page.getByRole("link", { name: "Sparziel auswählen" }).click();
    await page
      .getByRole("link", { name: "Reserve öffnen", exact: true })
      .click();
    await expect(page).toHaveURL(/\/account\/goals\/[0-9a-f-]+$/);
    const goalUrl = page.url();
    await page
      .getByRole("link", { name: "Sparprognose mit Life AI verstehen" })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Dein Sparziel mit Life AI" }),
    ).toBeVisible();
    const facts = page.getByRole("region", {
      name: "Verwendete Prognosedaten",
    });
    await expect(facts).toContainText("10.000,00 €");
    await expect(facts).toContainText("3.500,00 €");
    await expect(facts).toContainText("6.500,00 €");
    await expect(facts).toContainText("Folgemona");
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
      path: testInfo.outputPath("ai-goal-light.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await page.screenshot({
      path: testInfo.outputPath("ai-goal-dark.png"),
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Sparziel und Prognose prüfen" })
      .click();
    await expect(page).toHaveURL(goalUrl);
  } finally {
    await removeFixture(user.id);
  }
});
test("goal explanation isolates foreign, missing and personal goals and protects unfinished accounts", async ({
  page,
}) => {
  const user = await createPlanFixture(),
    foreign = await createPlanFixture();
  const unfinished = await createPlanFixture({ complete: false });
  try {
    await page.goto(`/account/ai/goals/${randomUUID()}`);
    await expect(page).toHaveURL(/\/auth\/login/);
    await login(page, user);
    for (const id of [
      await financialLinkGoal(foreign),
      randomUUID(),
      await createLinkGoal(user),
    ]) {
      await page.goto(`/account/ai/goals/${id}`);
      await expect(
        page.getByRole("heading", { name: "Sparprognose nicht verfügbar" }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Verwendete Prognosedaten" }),
      ).toHaveCount(0);
    }
    await page.goto("/account/ai/goals/invalid");
    await expect(
      page.getByRole("heading", { name: "Diese Seite gibt es nicht." }),
    ).toBeVisible();
    await page.context().clearCookies();
    await login(page, unfinished);
    await page.goto(`/account/ai/goals/${await financialLinkGoal(user)}`);
    await expect(page).toHaveURL(/\/account\/onboarding/);
  } finally {
    for (const fixture of [user, foreign, unfinished])
      await removeFixture(fixture.id);
  }
});
