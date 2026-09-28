import { expect, test, type Page } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { removeFixture } from "../supabase/fixtures";
import {
  createTask,
  readTasks,
  type TaskAccount,
} from "../supabase/task-fixtures";
import { dateInZone } from "../../src/domain/transactions";

async function login(page: Page, user: TaskAccount) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
}
async function saved(page: Page) {
  await expect(page).toHaveURL(/\/account\/plan\?/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Deine Aufgaben",
  );
}
test("tasks support keyboard creation, editing, completion, reopening and confirmed deletion", async ({
  page,
}, testInfo) => {
  const user = await createPlanFixture();
  try {
    await login(page, user);
    await page.goto("/plan");
    await page.getByRole("link", { name: "Private Aufgaben öffnen" }).click();
    await expect(page.getByRole("main")).toContainText(
      "In dieser Ansicht gibt es noch keine Aufgaben",
    );
    await page
      .getByRole("link", { name: "Aufgabe anlegen", exact: true })
      .click();
    await page.getByRole("button", { name: "Aufgabe speichern" }).click();
    await expect(page.getByLabel("Titel der Aufgabe")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.getByLabel("Titel der Aufgabe").fill("Reise vorbereiten");
    await page.getByLabel("Priorität", { exact: true }).selectOption("high");
    await page.getByRole("button", { name: "Aufgabe speichern" }).focus();
    await page.keyboard.press("Enter");
    await saved(page);
    await expect(page.getByRole("main")).toContainText("Ohne Fälligkeitsdatum");
    await page
      .getByRole("link", { name: "Reise vorbereiten bearbeiten" })
      .click();
    await page.getByLabel("Titel der Aufgabe").fill("Unterkunft suchen");
    await page.getByLabel("Fällig am (optional)").fill("2026-09-30");
    await page.getByRole("button", { name: "Aufgabe speichern" }).click();
    await saved(page);
    await page.reload();
    await expect(page.getByRole("main")).toContainText("Fällig am 30.09.2026");
    await expect(page.getByRole("main")).toContainText("Priorität: Hoch");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("main")
      .screenshot({ path: testInfo.outputPath("tasks-light.png") });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await page
      .getByRole("main")
      .screenshot({ path: testInfo.outputPath("tasks-dark.png") });
    await page
      .getByRole("button", {
        name: "Als erledigt markieren: Unterkunft suchen",
      })
      .click();
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "0 offene",
    );
    await page
      .getByRole("navigation", { name: "Aufgabenstatus" })
      .getByRole("link", { name: "Erledigt", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Unterkunft suchen", exact: true }),
    ).toBeVisible();
    await page.reload();
    await page
      .getByRole("link", { name: "Unterkunft suchen bearbeiten" })
      .click();
    await page.getByLabel("Fällig am (optional)").fill("");
    await page.getByRole("button", { name: "Aufgabe speichern" }).click();
    await saved(page);
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "1 erledigte",
    );
    await page
      .getByRole("button", { name: "Wieder öffnen: Unterkunft suchen" })
      .click();
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "0 erledigte",
    );
    await page
      .getByRole("navigation", { name: "Aufgabenstatus" })
      .getByRole("link", { name: "Offen", exact: true })
      .click();
    await page.getByRole("link", { name: "Unterkunft suchen löschen" }).click();
    await page
      .getByRole("button", { name: "Aufgabe löschen", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Bitte bestätige",
    );
    await page.getByRole("link", { name: "Abbrechen und zurück" }).click();
    await expect(
      page.getByRole("heading", { name: "Unterkunft suchen", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Unterkunft suchen löschen" }).click();
    await page.getByRole("checkbox", { name: "Diese Aufgabe löschen" }).check();
    await page
      .getByRole("button", { name: "Aufgabe löschen", exact: true })
      .click();
    await saved(page);
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "0 offene",
    );
    await page.reload();
    expect((await readTasks(user)).total).toBe(0);
  } finally {
    await removeFixture(user.id);
  }
});

test("stale task forms retain input and foreign, invalid and anonymous routes reveal no tasks", async ({
  page,
  context,
}) => {
  const user = await createPlanFixture(),
    other = await createPlanFixture();
  try {
    const id = await createTask(user, "Original");
    const foreign = await createTask(other, "Privater fremder Titel");
    await login(page, user);
    await page.goto(`/account/plan/${id}`);
    const stale = await context.newPage();
    await stale.goto(`/account/plan/${id}`);
    await expect(stale.getByLabel("Titel der Aufgabe")).toHaveValue("Original");
    await page.getByLabel("Titel der Aufgabe").fill("Neuer Stand");
    await page.getByRole("button", { name: "Aufgabe speichern" }).click();
    await saved(page);
    await stale.getByLabel("Titel der Aufgabe").fill("Mein Entwurf");
    await stale.getByRole("button", { name: "Aufgabe speichern" }).click();
    await expect(stale.getByRole("main").getByRole("alert")).toContainText(
      "inzwischen geändert",
    );
    await expect(stale.getByLabel("Titel der Aufgabe")).toHaveValue(
      "Mein Entwurf",
    );
    await stale.getByRole("link", { name: "Aktuellen Stand öffnen" }).click();
    await expect(
      stale.getByRole("heading", { name: "Neuer Stand", exact: true }),
    ).toBeVisible();
    await stale.goto(`/account/plan/${id}`);
    await expect(stale.getByLabel("Titel der Aufgabe")).toHaveValue(
      "Neuer Stand",
    );
    await page.getByRole("link", { name: "Neuer Stand löschen" }).click();
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Aufgabe löschen", exact: true })
      .click();
    await saved(page);
    await stale.getByRole("button", { name: "Aufgabe speichern" }).click();
    await expect(stale.getByRole("main").getByRole("alert")).toContainText(
      "nicht mehr verfügbar",
    );
    await stale.close();
    for (const path of [
      `/account/plan/${foreign}`,
      `/account/plan/${foreign}?action=remove`,
      "/account/plan?view=invalid",
      "/account/plan?day=2026-02-29",
      "/account/plan?page=-1",
      "/account/plan/new?action=remove",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Seite",
      );
      await expect(page.getByRole("main")).not.toContainText(
        "Privater fremder Titel",
      );
    }
    await context.clearCookies();
    await page.goto("/account/plan");
    await expect(page).toHaveURL("/auth/login");
    await page.goto(`/account/plan/${foreign}`);
    await expect(page).toHaveURL("/auth/login");
  } finally {
    await Promise.all([removeFixture(user.id), removeFixture(other.id)]);
  }
});

test("task views retain filters, paginate completely and use the profile zone for today", async ({
  page,
}) => {
  const user = await createPlanFixture();
  try {
    for (let i = 0; i < 24; i++)
      await createTask(user, `Schritt ${i + 1}`, "2026-09-28");
    await createTask(user, "Nächste Woche", "2026-10-05");
    await createTask(user, "Irgendwann");
    expect(
      (
        await user.client
          .from("profiles")
          .update({ time_zone: "Pacific/Honolulu" })
          .eq("user_id", user.id)
      ).error,
    ).toBeNull();
    await login(page, user);
    await page.goto("/account/plan");
    const today = dateInZone(new Date(), "Pacific/Honolulu");
    await expect(page.getByRole("main")).toContainText("Pacific/Honolulu");
    await expect(
      page
        .getByRole("navigation", { name: "Aufgabenansicht" })
        .getByRole("link", { name: "Tag", exact: true }),
    ).toHaveAttribute("href", new RegExp(`day=${today}`));
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "26 offene",
    );
    await page.getByRole("link", { name: "Nächste Seite" }).click();
    await expect(page.getByRole("main")).toContainText("Seite 2 · 26 Aufgaben");
    await expect(
      page.getByRole("heading", { name: "Irgendwann", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Als erledigt markieren: Irgendwann" })
      .click();
    await expect(page).toHaveURL(/page=1$/);
    await expect(page.getByRole("main")).toContainText(
      "Auf dieser Seite gibt es keine Aufgaben",
    );
    await page.getByRole("link", { name: "Vorherige Seite" }).click();
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "25 offene",
    );
    await page
      .getByRole("navigation", { name: "Aufgabenansicht" })
      .getByRole("link", { name: "Woche", exact: true })
      .click();
    await page.getByLabel("Tag in der gewünschten Woche").fill("2026-09-30");
    await page.getByRole("button", { name: "Zeitraum anzeigen" }).click();
    await expect(page.getByRole("main")).toContainText(
      "28.09.2026 – 04.10.2026",
    );
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "24 offene",
    );
    await expect(
      page.getByRole("heading", { name: "Nächste Woche", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("navigation", { name: "Aufgabenansicht" })
      .getByRole("link", { name: "Tag", exact: true })
      .click();
    await expect(page.getByLabel("Tag auswählen")).toHaveValue("2026-09-30");
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "0 offene",
    );
    await page.getByLabel("Tag auswählen").fill("2026-09-28");
    await page.getByRole("button", { name: "Zeitraum anzeigen" }).click();
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "24 offene",
    );
    await page
      .getByRole("navigation", { name: "Aufgabenansicht" })
      .getByRole("link", { name: "Ohne Datum", exact: true })
      .click();
    await expect(
      page
        .getByRole("navigation", { name: "Aufgabenansicht" })
        .getByRole("link", { name: "Ohne Datum", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page
      .getByRole("navigation", { name: "Aufgabenstatus" })
      .getByRole("link", { name: "Erledigt", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "1 erledigte",
    );
    await expect(
      page.getByRole("heading", { name: "Irgendwann", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "1 erledigte",
    );
  } finally {
    await removeFixture(user.id);
  }
});
