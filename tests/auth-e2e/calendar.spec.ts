import { expect, test, type Page } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { removeFixture } from "../supabase/fixtures";
import {
  createEvent,
  readEvents,
  type CalendarAccount,
} from "../supabase/calendar-fixtures";
async function login(page: Page, user: CalendarAccount) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
}
async function saved(page: Page) {
  await expect(page).toHaveURL(/\/account\/plan\/calendar\?/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Dein Kalender",
  );
}
const week = "/account/plan/calendar?view=week&day=2026-09-28&page=0";
test("calendar supports keyboard creation, spanning days, edits and confirmed deletion", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "desktop-auth")
    await page.setViewportSize({ width: 1440, height: 900 });
  const user = await createPlanFixture();
  try {
    await login(page, user);
    await page.goto("/plan");
    await page.getByRole("link", { name: "Privaten Kalender öffnen" }).click();
    await expect(page.getByRole("main")).toContainText(
      "Keine Termine in diesem Zeitraum",
    );
    await page
      .getByRole("link", { name: "Termin anlegen", exact: true })
      .click();
    await page.getByRole("button", { name: "Termin speichern" }).click();
    await expect(page.getByLabel("Titel des Termins")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.getByLabel("Titel des Termins").fill("Nachtfahrt");
    await page.getByLabel("Beginn", { exact: true }).fill("2026-09-28T23:30");
    await page.getByLabel("Ende", { exact: true }).fill("2026-09-30T00:00");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("main")
      .screenshot({ path: testInfo.outputPath("calendar-form.png") });
    await page.getByRole("button", { name: "Termin speichern" }).focus();
    await page.keyboard.press("Enter");
    await saved(page);
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "1 Termin im Zeitraum",
    );
    for (const day of ["28.09.2026", "29.09.2026"])
      await expect(
        page
          .getByRole("region", { name: `Termine am ${day}` })
          .getByRole("heading", { name: "Nachtfahrt", exact: true }),
      ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Termine am 30.09.2026" })
        .getByRole("heading", { name: "Nachtfahrt", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("main")
      .screenshot({ path: testInfo.outputPath("calendar-light.png") });
    await page.getByRole("button", { name: "Farbschema wechseln" }).click();
    await page
      .getByRole("main")
      .screenshot({ path: testInfo.outputPath("calendar-dark.png") });
    await page
      .getByRole("link", { name: "Nachtfahrt bearbeiten" })
      .first()
      .click();
    await expect(page.getByLabel("Beginn", { exact: true })).toHaveValue(
      "2026-09-28T23:30",
    );
    await page.getByLabel("Titel des Termins").fill("Ankunft");
    await page.getByLabel("Beginn", { exact: true }).fill("2026-09-29T10:00");
    await page.getByLabel("Ende", { exact: true }).fill("2026-09-29T11:00");
    await page.getByRole("button", { name: "Termin speichern" }).click();
    await saved(page);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Ankunft", exact: true }),
    ).toHaveCount(1);
    await page.getByRole("link", { name: "Ankunft löschen" }).click();
    await page
      .getByRole("button", { name: "Termin löschen", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Bitte bestätige",
    );
    await page.getByRole("link", { name: "Abbrechen und zurück" }).click();
    await expect(
      page.getByRole("heading", { name: "Ankunft", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Ankunft löschen" }).click();
    await page.getByRole("checkbox", { name: "Diesen Termin löschen" }).check();
    await page
      .getByRole("button", { name: "Termin löschen", exact: true })
      .click();
    await saved(page);
    expect((await readEvents(user)).total).toBe(0);
  } finally {
    await removeFixture(user.id);
  }
});
test("calendar rejects missing and repeated wall times and preserves an explicit fold choice", async ({
  page,
}) => {
  const user = await createPlanFixture();
  try {
    await login(page, user);
    await page.goto(`${week.replace("calendar?", "calendar/new?")}`);
    await page.getByLabel("Titel des Termins").fill("Zeitumstellung");
    await page.getByLabel("Beginn", { exact: true }).fill("2026-03-29T02:30");
    await page.getByLabel("Ende", { exact: true }).fill("2026-03-29T04:00");
    await page.getByRole("button", { name: "Termin speichern" }).click();
    await expect(
      page.getByText("Diese Uhrzeit existiert", { exact: false }),
    ).toBeVisible();
    await page.getByLabel("Beginn", { exact: true }).fill("2026-10-25T02:30");
    await page.getByLabel("Ende", { exact: true }).fill("2026-10-25T03:30");
    await page.getByRole("button", { name: "Termin speichern" }).click();
    await expect(
      page.getByText("Diese Uhrzeit kommt zweimal vor", { exact: false }),
    ).toBeVisible();
    await page
      .getByLabel("Beginn: bei doppelter Uhrzeit")
      .selectOption("later");
    await page.getByRole("button", { name: "Termin speichern" }).click();
    await saved(page);
    await expect(page.getByRole("main")).toContainText(
      "25.10.2026, 02:30 (UTC+01:00)",
    );
    await page.getByRole("link", { name: "Zeitumstellung bearbeiten" }).click();
    await expect(page.getByLabel("Beginn: bei doppelter Uhrzeit")).toHaveValue(
      "later",
    );
    await expect(page.getByLabel("Beginn", { exact: true })).toHaveValue(
      "2026-10-25T02:30",
    );
    await page.getByLabel("Ende", { exact: true }).fill("2026-10-25T02:00");
    await page
      .getByLabel("Ende: bei doppelter Uhrzeit")
      .selectOption("earlier");
    await page.getByRole("button", { name: "Termin speichern" }).click();
    await expect(
      page.getByText("Das Ende muss nach dem Beginn liegen."),
    ).toBeVisible();
    const data = await readEvents(user, {
      p_start: "2026-10-25T00:00:00Z",
      p_end: "2026-10-26T00:00:00Z",
    });
    expect(Date.parse(data.items[0]!.starts_at)).toBe(
      Date.parse("2026-10-25T01:30:00Z"),
    );
    expect(data.items[0]?.revision).toBe(0);
  } finally {
    await removeFixture(user.id);
  }
});
test("calendar stale forms retain input and protected routes reveal no foreign events", async ({
  page,
  context,
}) => {
  const user = await createPlanFixture(),
    other = await createPlanFixture();
  try {
    const id = await createEvent(user, "Original"),
      foreign = await createEvent(other, "Geheimer fremder Termin");
    await login(page, user);
    await page.goto(`/account/plan/calendar/${id}?day=2026-09-28`);
    const stale = await context.newPage();
    await stale.goto(page.url());
    await expect(stale.getByLabel("Titel des Termins")).toHaveValue("Original");
    await page.getByLabel("Titel des Termins").fill("Neuer Stand");
    await page.getByRole("button", { name: "Termin speichern" }).click();
    await saved(page);
    await stale.getByLabel("Titel des Termins").fill("Mein Entwurf");
    await stale.getByRole("button", { name: "Termin speichern" }).click();
    await expect(stale.getByRole("main").getByRole("alert")).toContainText(
      "inzwischen geändert",
    );
    await expect(stale.getByLabel("Titel des Termins")).toHaveValue(
      "Mein Entwurf",
    );
    await stale.close();
    for (const path of [
      `/account/plan/calendar/${foreign}`,
      "/account/plan/calendar/invalid",
      `${week}&view=invalid`,
      "/account/plan/calendar?day=2026-02-29",
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: "Diese Seite gibt es nicht." }),
      ).toBeVisible();
      await expect(page.getByRole("main")).not.toContainText(
        "Geheimer fremder Termin",
      );
    }
    await page.goto(
      `/account/plan/calendar/${id}?id=${foreign}&day=2026-09-28`,
    );
    await expect(page.getByLabel("Titel des Termins")).toHaveValue(
      "Neuer Stand",
    );
    await context.clearCookies();
    await page.goto(week);
    await expect(page).toHaveURL("/auth/login");
    await page.goto(`/account/plan/calendar/${foreign}`);
    await expect(page).toHaveURL("/auth/login");
  } finally {
    await Promise.all([removeFixture(user.id), removeFixture(other.id)]);
  }
});
test("calendar counts distinct events across pages and displays days in the profile zone", async ({
  page,
}) => {
  const user = await createPlanFixture();
  try {
    for (let i = 0; i < 26; i++)
      await createEvent(user, `Termin ${i + 1}`, {
        p_starts_at: "2026-09-29T00:30:00Z",
        p_ends_at: "2026-09-29T01:00:00Z",
      });
    expect(
      (
        await user.client
          .from("profiles")
          .update({ time_zone: "America/Los_Angeles" })
          .eq("user_id", user.id)
      ).error,
    ).toBeNull();
    await login(page, user);
    await page.goto(week);
    await expect(page.getByRole("main")).toContainText(
      "Profilzeitzone America/Los_Angeles",
    );
    await expect(page.getByRole("main").getByRole("status")).toHaveText(
      "26 Termine im Zeitraum · 25 auf dieser Seite",
    );
    await expect(
      page
        .getByRole("region", { name: "Termine am 28.09.2026" })
        .getByRole("heading", { level: 3 }),
    ).toHaveCount(25);
    await expect(
      page
        .getByRole("region", { name: "Termine am 29.09.2026" })
        .getByRole("heading", { level: 3 }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "Nächste Seite" }).click();
    await expect(page.getByRole("main")).toContainText("Seite 2 · 26 Termine");
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(1);
    await page
      .getByRole("main")
      .getByRole("link", { name: / löschen$/ })
      .click();
    await page.getByRole("checkbox", { name: "Diesen Termin löschen" }).check();
    await page
      .getByRole("button", { name: "Termin löschen", exact: true })
      .click();
    await saved(page);
    await expect(page).toHaveURL(/page=1$/);
    await expect(page.getByRole("main")).toContainText(
      "Auf dieser Seite gibt es keine Termine",
    );
    await page.getByRole("link", { name: "Vorherige Seite" }).click();
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "25 Termine im Zeitraum",
    );
    await page
      .getByRole("navigation", { name: "Kalenderansicht" })
      .getByRole("link", { name: "Tag", exact: true })
      .click();
    await expect(
      page
        .getByRole("navigation", { name: "Kalenderansicht" })
        .getByRole("link", { name: "Tag", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page.getByLabel("Tag auswählen").fill("2026-09-29");
    await page.getByRole("button", { name: "Zeitraum anzeigen" }).click();
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      "0 Termine im Zeitraum",
    );
    await page.reload();
    await expect(page.getByLabel("Tag auswählen")).toHaveValue("2026-09-29");
  } finally {
    await removeFixture(user.id);
  }
});
