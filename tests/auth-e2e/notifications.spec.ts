import { expect, test, type Page } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { removeFixture } from "../supabase/fixtures";
import { createTask, mutateTask } from "../supabase/task-fixtures";
import { createLinkBudget } from "../supabase/link-fixtures";
import { generateReview, reviewExpense } from "../supabase/review-fixtures";
import {
  notificationGoal,
  notificationPeriod,
  readNotifications,
  synchronize,
  type NotificationAccount,
} from "../supabase/notification-fixtures";

async function login(page: Page, user: NotificationAccount) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
}
test("explicit checks create own source links and preserve chosen read state on reload and repeated checks", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture(),
    period = notificationPeriod();
  try {
    const task = await createTask(user, "Browseraufgabe", period.yesterday);
    await notificationGoal(user, period.yesterday, "Browserziel");
    await createLinkBudget(user, period.month);
    await reviewExpense(user, period.day, 45000);
    expect((await generateReview(user)).error).toBeNull();
    await login(page, user);
    await page.goto("/account/home");
    await page.getByRole("link", { name: "Benachrichtigungen öffnen" }).click();
    await expect(page).toHaveURL("/account/notifications");
    await expect(page.getByRole("main")).toContainText(
      "Noch keine Hinweise gespeichert",
    );
    expect((await readNotifications(user)).total).toBe(0);
    await page
      .getByRole("button", { name: "Hinweise prüfen", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toContainText(
      "4 neue Hinweise gespeichert",
    );
    await expect(page.getByRole("article")).toHaveCount(4);
    expect((await readNotifications(user)).total).toBe(4);
    await expect(
      page.getByRole("article").filter({ hasText: "Alltagsbudget" }),
    ).toContainText("450,00 €");
    const taskCard = page
      .getByRole("article")
      .filter({ hasText: "Browseraufgabe" });
    await taskCard
      .getByRole("button", { name: "Als gelesen markieren", exact: true })
      .click();
    await expect(
      taskCard.getByRole("button", {
        name: "Als ungelesen markieren",
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    await expect(
      taskCard.getByRole("button", {
        name: "Als ungelesen markieren",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Nur ungelesene", exact: true })
      .click();
    await expect(page.getByRole("article")).toHaveCount(3);
    await expect(page.getByRole("main")).not.toContainText("Browseraufgabe");
    await page
      .getByRole("button", { name: "Hinweise prüfen", exact: true })
      .click();
    await expect(page.getByRole("main")).toContainText(
      "0 neue Hinweise gespeichert",
    );
    await expect(page.getByRole("article")).toHaveCount(3);
    await page
      .getByRole("link", { name: "Alle Hinweise", exact: true })
      .click();
    await taskCard
      .getByRole("button", { name: "Als ungelesen markieren", exact: true })
      .click();
    await expect(
      taskCard.getByRole("button", {
        name: "Als gelesen markieren",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText("4 ungelesen");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("notifications-light.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await page.screenshot({
      path: testInfo.outputPath("notifications-dark.png"),
      fullPage: true,
    });
    await taskCard
      .getByRole("link", { name: "Originaleintrag öffnen", exact: true })
      .click();
    await expect(page).toHaveURL(`/account/plan/${task}`);
    expect((await readNotifications(user)).unread).toBe(4);
  } finally {
    await removeFixture(user.id);
  }
});
test("stale tabs cannot overwrite newer read state and deleted sources disappear", async ({
  page,
  context,
}) => {
  const user = await createPlanFixture();
  try {
    const task = await createTask(user, "Konflikthinweis", "2026-01-01");
    expect((await synchronize(user)).error).toBeNull();
    await login(page, user);
    await page.goto("/account/notifications");
    await page
      .getByRole("button", { name: "Als gelesen markieren", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Als ungelesen markieren",
        exact: true,
      }),
    ).toBeVisible();
    const other = await context.newPage();
    await other.goto("/account/notifications");
    await other
      .getByRole("button", { name: "Als ungelesen markieren", exact: true })
      .click();
    await expect(
      other.getByRole("button", { name: "Als gelesen markieren", exact: true }),
    ).toBeVisible();
    await other
      .getByRole("button", { name: "Als gelesen markieren", exact: true })
      .click();
    await expect(
      other.getByRole("button", {
        name: "Als ungelesen markieren",
        exact: true,
      }),
    ).toBeVisible();
    await other.close();
    await page
      .getByRole("button", { name: "Als ungelesen markieren", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "inzwischen geändert",
    );
    expect((await readNotifications(user)).items[0]?.revision).toBe(3);
    await page.getByRole("link", { name: "Aktuellen Stand neu laden" }).click();
    await expect(
      page.getByRole("button", {
        name: "Als ungelesen markieren",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      (await mutateTask(user, { p_id: task, p_operation: "remove" })).error,
    ).toBeNull();
    await page.reload();
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByRole("main")).not.toContainText("Konflikthinweis");
  } finally {
    await removeFixture(user.id);
  }
});
test("pagination reaches every stored notification and unread filtering starts on the first page", async ({
  page,
}) => {
  const user = await createPlanFixture();
  try {
    for (let i = 0; i < 27; i++)
      await createTask(user, `Seitenhinweis ${i}`, "2026-01-01");
    expect((await synchronize(user)).data).toBe(27);
    await login(page, user);
    await page.goto("/account/notifications");
    await expect(page.getByRole("article")).toHaveCount(25);
    await expect(page.getByRole("main")).toContainText(
      "27 ungelesen · 27 insgesamt",
    );
    await page
      .getByRole("link", { name: "Nächste Seite", exact: true })
      .click();
    await expect(page).toHaveURL(/page=1/);
    await expect(page.getByRole("article")).toHaveCount(2);
    await page
      .getByRole("article")
      .first()
      .getByRole("button", { name: "Als gelesen markieren", exact: true })
      .click();
    await expect(page.getByRole("main")).toContainText("26 ungelesen");
    await page
      .getByRole("link", { name: "Nur ungelesene", exact: true })
      .click();
    await expect(page).toHaveURL(/filter=unread&page=0/);
    await expect(page.getByRole("article")).toHaveCount(25);
    await page
      .getByRole("link", { name: "Nächste Seite", exact: true })
      .click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Als gelesen markieren", exact: true })
      .click();
    await expect(page.getByRole("article")).toHaveCount(0);
    await page
      .getByRole("link", { name: "Zur ersten Seite", exact: true })
      .click();
    await expect(page.getByRole("article")).toHaveCount(25);
  } finally {
    await removeFixture(user.id);
  }
});
test("empty and invalid views never expose foreign notifications or change read state by opening", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture(),
    other = await createPlanFixture();
  try {
    await createTask(other, "Geheimer fremder Hinweis", "2026-01-01");
    expect((await synchronize(other)).data).toBe(1);
    await page.goto("/account/notifications");
    await expect(page).toHaveURL("/auth/login");
    await login(page, user);
    await page.goto(`/account/notifications?user_id=${other.id}`);
    await expect(page.getByRole("main")).toContainText(
      "Noch keine Hinweise gespeichert",
    );
    await page
      .getByRole("button", { name: "Hinweise prüfen", exact: true })
      .click();
    await expect(page.getByRole("main")).toContainText(
      "0 neue Hinweise gespeichert",
    );
    await expect(page.getByRole("main")).not.toContainText(
      "Geheimer fremder Hinweis",
    );
    await page
      .getByRole("link", { name: "Nur ungelesene", exact: true })
      .click();
    await expect(page.getByRole("main")).toContainText(
      "Keine ungelesenen Hinweise",
    );
    await page.screenshot({
      path: testInfo.outputPath("notifications-empty.png"),
      fullPage: true,
    });
    await page.goto("/account/notifications?filter=bad&page=-1");
    await expect(
      page.getByRole("heading", { name: "Diese Seite gibt es nicht." }),
    ).toBeVisible();
    expect((await readNotifications(other)).unread).toBe(1);
    expect((await readNotifications(user)).total).toBe(0);
  } finally {
    await removeFixture(user.id);
    await removeFixture(other.id);
  }
});
