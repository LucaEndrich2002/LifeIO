import { expect, test, type Page } from "@playwright/test";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { removeFixture } from "../supabase/fixtures";
import {
  createLinkGoal,
  financialLinkGoal,
  type LinkAccount,
} from "../supabase/link-fixtures";
import {
  createPlanTarget,
  removePlanTarget,
  mutatePlanLink,
  planLinkRows,
} from "../supabase/plan-link-fixtures";
import {
  goalPlanHref,
  planTargetHref,
  planKindLabel,
} from "../../src/domain/goal-plan-links";
async function login(page: Page, user: LinkAccount) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
}
for (const kind of ["task", "event"] as const) {
  test(`${kind} links both goal kinds, navigates in both directions and unlinks only after confirmation`, async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name === "desktop-auth")
      await page.setViewportSize({ width: 1440, height: 900 });
    const user = await createPlanFixture();
    try {
      const financial = await financialLinkGoal(user),
        personal = await createLinkGoal(user, "Sprache lernen"),
        label = planKindLabel[kind];
      await login(page, user);
      await page.goto(`/account/goals/${financial}`);
      await page
        .getByRole("link", {
          name: kind === "task" ? "Verknüpfte Aufgaben" : "Verknüpfte Termine",
          exact: true,
        })
        .click();
      await expect(page.getByRole("main").getByRole("status")).toContainText(
        "0",
      );
      await page
        .getByRole("link", { name: `${label} verknüpfen`, exact: true })
        .click();
      await expect(page.getByRole("main")).toContainText(
        "Lege zuerst einen Eintrag an.",
      );
      const target = await createPlanTarget(user, kind, "Reise vorbereiten");
      await page.reload();
      await page
        .getByRole("link", { name: "Reise vorbereiten auswählen" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Reise vorbereiten", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: `${label} mit Ziel verknüpfen` })
        .focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(goalPlanHref(financial, kind));
      await expect(page.getByRole("main").getByRole("status")).toContainText(
        "1",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("main")
        .screenshot({ path: testInfo.outputPath("plan-links-light.png") });
      await page.getByRole("button", { name: "Farbschema wechseln" }).click();
      await page
        .getByRole("main")
        .screenshot({ path: testInfo.outputPath("plan-links-dark.png") });
      await page
        .getByRole("link", { name: "Reise vorbereiten öffnen" })
        .click();
      await expect(page).toHaveURL(planTargetHref(kind, target));
      await page
        .getByRole("link", { name: "Verknüpfte Ziele", exact: true })
        .click();
      await page.getByRole("link", { name: "Reserve öffnen" }).click();
      await expect(page).toHaveURL(`/account/goals/${financial}`);
      await page.goto(
        `/account/goals/${personal}/plan/${kind}/new?target=${target}`,
      );
      await page
        .getByRole("button", { name: `${label} mit Ziel verknüpfen` })
        .click();
      await expect(page).toHaveURL(goalPlanHref(personal, kind));
      await page.goto(
        `/account/goals/${personal}/plan/${kind}/new?target=${target}`,
      );
      await expect(page.getByRole("main").getByRole("status")).toContainText(
        "bereits",
      );
      await expect(
        page.getByRole("button", { name: `${label} mit Ziel verknüpfen` }),
      ).toHaveCount(0);
      await page.goto(`${planTargetHref(kind, target)}/goals`);
      await expect(page.getByRole("main").getByRole("status")).toContainText(
        "2 Ziele",
      );
      await page
        .getByRole("link", { name: "Verknüpfung mit Sprache lernen entfernen" })
        .click();
      await page.getByRole("button", { name: "Entfernen bestätigen" }).click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "Bitte bestätige",
      );
      await page.getByRole("link", { name: "Abbrechen und zurück" }).click();
      await expect(page).toHaveURL(
        `${planTargetHref(kind, target)}/goals?page=0`,
      );
      await page
        .getByRole("link", { name: "Verknüpfung mit Sprache lernen entfernen" })
        .click();
      await page
        .getByRole("checkbox", { name: /Nur diese Verknüpfung entfernen/ })
        .check();
      await page.getByRole("button", { name: "Entfernen bestätigen" }).click();
      await expect(page).toHaveURL(
        `${planTargetHref(kind, target)}/goals?page=0`,
      );
      await expect(page.getByRole("main").getByRole("status")).toContainText(
        "1 Ziel",
      );
      await page.goto(`/account/goals/${personal}`);
      await expect(
        page.getByRole("heading", { name: "Sprache lernen", exact: true }),
      ).toBeVisible();
      await page.goto(planTargetHref(kind, target));
      await page
        .getByRole("link", { name: "Verknüpfte Ziele", exact: true })
        .click();
      await expect(
        page.getByRole("link", { name: "Reserve öffnen" }),
      ).toBeVisible();
      expect((await planLinkRows(user, personal, kind)).count).toBe(0);
      expect((await planLinkRows(user, financial, kind)).count).toBe(1);
    } finally {
      await removeFixture(user.id);
    }
  });
  test(`${kind} selection and both link directions paginate completely and preserve empty later pages`, async ({
    page,
  }) => {
    const user = await createPlanFixture();
    try {
      const goal = await createLinkGoal(user, "Hauptziel"),
        target = await createPlanTarget(user, kind, "Erster Eintrag");
      expect((await mutatePlanLink(user, goal, kind, target)).error).toBeNull();
      for (let i = 0; i < 25; i++) {
        const other = await createPlanTarget(user, kind, `Schritt ${i}`),
          otherGoal = await createLinkGoal(user, `Ziel ${i}`);
        expect(
          (await mutatePlanLink(user, goal, kind, other)).error,
        ).toBeNull();
        expect(
          (await mutatePlanLink(user, otherGoal, kind, target)).error,
        ).toBeNull();
      }
      await login(page, user);
      await page.goto(goalPlanHref(goal, kind, 0, "choose"));
      await expect(page.getByRole("main").getByRole("status")).toContainText(
        "26",
      );
      await page.getByRole("link", { name: "Nächste Seite" }).click();
      await expect(
        page.getByRole("navigation", { name: "Auswahlseiten" }),
      ).toContainText("Seite 2 · 26 Einträge");
      await page
        .getByRole("link", { name: "Erster Eintrag auswählen" })
        .click();
      await expect(page.getByRole("main").getByRole("status")).toContainText(
        "bereits",
      );
      await page.getByRole("link", { name: "Zu den Verknüpfungen" }).click();
      await page.getByRole("link", { name: "Nächste Seite" }).click();
      await expect(
        page.getByRole("navigation", { name: "Verknüpfungsseiten" }),
      ).toContainText("Seite 2 · 26 Verknüpfungen");
      await page.getByRole("link", { name: "Erster Eintrag öffnen" }).click();
      await page
        .getByRole("link", { name: "Verknüpfte Ziele", exact: true })
        .click();
      await expect(page.getByRole("main").getByRole("status")).toContainText(
        "26 Ziele",
      );
      await page.getByRole("link", { name: "Nächste Seite" }).click();
      await expect(
        page.getByRole("navigation", { name: "Zielseiten" }),
      ).toContainText("Seite 2 · 26 Verknüpfungen");
      await page
        .getByRole("link", { name: "Verknüpfung mit Hauptziel entfernen" })
        .click();
      await page
        .getByRole("checkbox", { name: /Nur diese Verknüpfung entfernen/ })
        .check();
      await page.getByRole("button", { name: "Entfernen bestätigen" }).click();
      await expect(page).toHaveURL(
        `${planTargetHref(kind, target)}/goals?page=1`,
      );
      await expect(page.getByRole("main")).toContainText(
        "Auf dieser Seite gibt es keine Verknüpfungen",
      );
      await page.getByRole("link", { name: "Vorherige Seite" }).click();
      await expect(page.getByRole("main").getByRole("status")).toContainText(
        "25 Ziele",
      );
      await page.goto(goalPlanHref(goal, kind, 1));
      await expect(page.getByRole("main")).toContainText(
        "Auf dieser Seite gibt es keine Einträge",
      );
      await page.getByRole("link", { name: "Vorherige Seite" }).click();
      await expect(page.getByRole("main").getByRole("status")).toContainText(
        "25",
      );
    } finally {
      await removeFixture(user.id);
    }
  });
}
test("stale selections, deleted endpoints, forged route inputs and anonymous access are protected", async ({
  page,
  context,
}) => {
  const user = await createPlanFixture(),
    foreign = await createPlanFixture();
  try {
    const goal = await createLinkGoal(user),
      foreignGoal = await createLinkGoal(foreign);
    await login(page, user);
    for (const kind of ["task", "event"] as const) {
      const target = await createPlanTarget(user, kind),
        foreignTarget = await createPlanTarget(foreign, kind);
      await page.goto(
        `/account/goals/${goal}/plan/${kind}/new?target=${target}`,
      );
      await expect(
        page.getByRole("button", {
          name: `${planKindLabel[kind]} mit Ziel verknüpfen`,
        }),
      ).toBeVisible();
      expect((await removePlanTarget(user, kind, target)).error).toBeNull();
      await page
        .getByRole("button", {
          name: `${planKindLabel[kind]} mit Ziel verknüpfen`,
        })
        .click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "nicht mehr verfügbar",
      );
      for (const url of [
        goalPlanHref(foreignGoal, kind),
        `/account/goals/${goal}/plan/${kind}/new?target=${foreignTarget}`,
        `${planTargetHref(kind, foreignTarget)}/goals`,
        `${planTargetHref(kind, target)}/goals`,
        goalPlanHref(goal, kind) + "&page=invalid",
      ]) {
        await page.goto(url);
        await expect(
          page.getByRole("heading", { name: "Diese Seite gibt es nicht." }),
        ).toBeVisible();
      }
      const current = await createPlanTarget(user, kind, "Eigener Eintrag");
      expect(
        (await mutatePlanLink(user, goal, kind, current)).error,
      ).toBeNull();
      const link = (await planLinkRows(user, goal, kind)).data![0]!.id;
      await page.goto(`/account/goals/${goal}/budgets/${link}`);
      await expect(
        page.getByRole("heading", { name: "Diese Seite gibt es nicht." }),
      ).toBeVisible();
      await page.goto(
        `/account/goals/${goal}/plan/${kind}/${link}?goalId=${foreignGoal}&id=${foreignTarget}&kind=wrong`,
      );
      await expect(
        page.getByRole("heading", { name: "Eigener Eintrag", exact: true }),
      ).toBeVisible();
    }
    await context.clearCookies();
    await page.goto(goalPlanHref(goal, "task"));
    await expect(page).toHaveURL("/auth/login");
  } finally {
    await Promise.all([removeFixture(user.id), removeFixture(foreign.id)]);
  }
});
