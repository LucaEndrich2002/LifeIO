import { expect, test, type Page } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { removeFixture } from "../supabase/fixtures";
import { createTask } from "../supabase/task-fixtures";
import { createEvent } from "../supabase/calendar-fixtures";
import {
  generateReview,
  readReview,
  reviewExpense,
  reviewWeek,
  type ReviewAccount,
} from "../supabase/review-fixtures";

async function login(page: Page, user: ReviewAccount) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
}
test("review is explicitly created, persists on reopen and refreshes the same week with a visible version", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture();
  try {
    await reviewExpense(user, "2026-09-30", 12500);
    await reviewExpense(user, "2026-09-25", 25000);
    const task = await createTask(user, "Wochentest Aufgabe", "2026-10-02");
    await createEvent(user, "Termin der Folgewoche", {
      p_starts_at: "2026-10-06T10:00:00Z",
      p_ends_at: "2026-10-06T11:00:00Z",
    });
    await login(page, user);
    await page.goto("/account/home");
    await page.getByRole("link", { name: "Wochenrückblick öffnen" }).click();
    await expect(page).toHaveURL("/account/review");
    await page.getByLabel("Tag in der gewünschten Woche").fill("2026-09-30");
    await page.getByRole("button", { name: "Woche anzeigen" }).click();
    await expect(page).toHaveURL(/week=2026-09-30/);
    await expect(page.getByRole("main")).toContainText(
      "Noch kein Rückblick für diese Woche",
    );
    expect(
      (await user.client.from("weekly_reviews").select("week_start")).data,
    ).toEqual([]);
    await page
      .getByRole("button", { name: "Wochenrückblick erstellen" })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/account/review?week=${reviewWeek}`);
    await expect(
      page.getByRole("region", { name: "Datenstand", exact: true }),
    ).toContainText("Gespeicherte Fassung 1");
    await expect(
      page.getByRole("main").getByTestId("review-week-spent"),
    ).toHaveText("125,00 €");
    await expect(page.getByRole("main")).toContainText("125,00 € weniger");
    await expect(page.getByRole("main")).toContainText("Termin der Folgewoche");
    await expect(page.getByRole("main")).toContainText(
      "Volle Monatswerte zum Datenstand",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("weekly-review-light.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await page.screenshot({
      path: testInfo.outputPath("weekly-review-dark.png"),
      fullPage: true,
    });
    const first = await readReview(user);
    await reviewExpense(user, "2026-10-01", 500);
    await page.reload();
    await expect(
      page.getByRole("main").getByTestId("review-week-spent"),
    ).toHaveText("125,00 €");
    expect(await readReview(user)).toEqual(first);
    await page.getByRole("button", { name: "Rückblick aktualisieren" }).click();
    await expect(
      page.getByRole("region", { name: "Datenstand", exact: true }),
    ).toContainText("Gespeicherte Fassung 2");
    await expect(
      page.getByRole("main").getByTestId("review-week-spent"),
    ).toHaveText("130,00 €");
    expect(
      (await user.client.from("weekly_reviews").select("week_start")).data,
    ).toHaveLength(1);
    await page
      .getByRole("link", { name: "Wochentest Aufgabe", exact: true })
      .click();
    await expect(page).toHaveURL(`/account/plan/${task}`);
    await page.goto(`/account/review?week=${reviewWeek}`);
    await page
      .getByRole("main")
      .getByText("Zuletzt gespeicherte Wochen", { exact: true })
      .click();
    await expect(
      page
        .getByRole("navigation", { name: "Gespeicherte Rückblicke" })
        .getByRole("link", { name: "Woche ab 28.09.2026" }),
    ).toBeVisible();
  } finally {
    await removeFixture(user.id);
  }
});
test("stale refresh keeps the latest review and offers a safe reload", async ({
  page,
  context,
}) => {
  const user = await createPlanFixture();
  try {
    expect((await generateReview(user)).error).toBeNull();
    await login(page, user);
    await page.goto(`/account/review?week=${reviewWeek}`);
    const other = await context.newPage();
    await other.goto(`/account/review?week=${reviewWeek}`);
    await reviewExpense(user, "2026-09-30", 100);
    await other
      .getByRole("button", { name: "Rückblick aktualisieren" })
      .click();
    await expect(
      other.getByRole("region", { name: "Datenstand", exact: true }),
    ).toContainText("Fassung 2");
    await other.close();
    await page.getByRole("button", { name: "Rückblick aktualisieren" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "inzwischen aktualisiert",
    );
    expect((await readReview(user)).revision).toBe(1);
    await page.getByRole("link", { name: "Aktuellen Stand neu laden" }).click();
    await expect(
      page.getByRole("region", { name: "Datenstand", exact: true }),
    ).toContainText("Fassung 2");
    await expect(
      page.getByRole("main").getByTestId("review-week-spent"),
    ).toHaveText("1,00 €");
  } finally {
    await removeFixture(user.id);
  }
});
test("empty, unfinished and foreign weeks reveal no invented or foreign data", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture({
      skipIncome: true,
      skipFixed: true,
      skipGoal: true,
    }),
    other = await createPlanFixture();
  try {
    await createTask(other, "Geheime fremde Aufgabe");
    expect((await generateReview(other, "2026-09-21")).error).toBeNull();
    await page.goto("/account/review");
    await expect(page).toHaveURL("/auth/login");
    await login(page, user);
    await page.goto(`/account/review?week=2026-09-21&user_id=${other.id}`);
    await expect(page.getByRole("main")).toContainText("Noch kein Rückblick");
    await expect(page.getByRole("main")).not.toContainText(
      "Geheime fremde Aufgabe",
    );
    await page
      .getByRole("button", { name: "Wochenrückblick erstellen" })
      .click();
    await expect(
      page.getByRole("region", { name: "Datenstand", exact: true }),
    ).toContainText("Fassung 1");
    await expect(page.getByRole("main")).toContainText(
      "Noch keine ausreichende Datengrundlage",
    );
    await expect(
      page.getByRole("main").getByTestId("review-week-spent"),
    ).toHaveText("Keine erfasst");
    await page.screenshot({
      path: testInfo.outputPath("weekly-review-empty.png"),
      fullPage: true,
    });
    await page.goto("/account/review?week=2100-12-13");
    await expect(page.getByRole("main")).toContainText(
      "Diese Woche ist noch nicht abgeschlossen",
    );
    await expect(
      page.getByRole("button", { name: "Wochenrückblick erstellen" }),
    ).toHaveCount(0);
    // The account loading boundary can stream HTTP 200 before notFound renders.
    await page.goto("/account/review?week=2026-02-30");
    await expect(
      page.getByRole("heading", { name: "Diese Seite gibt es nicht." }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Wochenrückblick erstellen" }),
    ).toHaveCount(0);
    expect(
      (await user.client.from("weekly_reviews").select("week_start")).data,
    ).toHaveLength(1);
  } finally {
    await removeFixture(user.id);
    await removeFixture(other.id);
  }
});
