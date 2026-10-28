import { expect, test, type Page } from "@playwright/test";
import { capturedAction } from "../server-actions";
import { createPlanFixture } from "../supabase/plan-fixtures";
import { removeFixture } from "../supabase/fixtures";
import { createTask, type TaskAccount } from "../supabase/task-fixtures";

async function login(page: Page, user: TaskAccount) {
  await page.goto("/auth/login");
  await page.getByLabel("E-Mail-Adresse").fill(user.email);
  await page.getByLabel("Passwort", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL("/account");
}

test("a direct task action rejects foreign, absent and forged identity before allowing its owner", async ({
  page,
  context,
  browser,
}) => {
  const accounts: TaskAccount[] = [];
  const foreignContext = await browser.newContext();
  const anonymousContext = await browser.newContext();
  try {
    const owner = await createPlanFixture();
    accounts.push(owner);
    const other = await createPlanFixture();
    accounts.push(other);
    const privateTitle = "Nur für den Eigentümer sichtbare Aufgabe";
    const id = await createTask(owner, privateTitle);
    const otherId = await createTask(other, "Unveränderte andere Aufgabe");
    async function record(user: TaskAccount, taskId: string) {
      const { data, error } = await user.client
        .from("tasks")
        .select("id, user_id, title, revision, completed_at")
        .eq("id", taskId)
        .single();
      if (error || !data)
        throw new Error("Could not read the owned task fixture.");
      return data;
    }
    const original = await record(owner, id);
    const otherOriginal = await record(other, otherId);
    await login(page, owner);
    await page.goto("/account/plan");

    // Intercept once, before mutation, so every replay carries a current revision.
    // The final owner control proves denials were not caused by a stale payload.
    await page.route("**/account/plan", async (route) => {
      const request = route.request();
      if (request.method() === "POST" && request.headers()["next-action"])
        await route.abort();
      else await route.continue();
    });
    // A request event precedes route handling. Wait for the abort to reach the
    // browser before removing the route, otherwise the owner POST can escape.
    const pendingAction = page.waitForEvent("requestfailed", {
      predicate: (request) =>
        request.method() === "POST" && !!request.headers()["next-action"],
    });
    await page
      .getByRole("button", { name: `Als erledigt markieren: ${privateTitle}` })
      .click();
    const replay = capturedAction(await pendingAction);
    await page.unrouteAll({ behavior: "wait" });
    expect(await record(owner, id)).toEqual(original);

    const foreignPage = await foreignContext.newPage();
    await login(foreignPage, other);
    const foreign = await foreignContext.request.post(
      replay.url,
      replay.options,
    );
    expect(foreign.status()).toBe(200);
    const foreignBody = await foreign.text();
    expect(foreignBody).toContain(
      "Die Aufgabe konnte nicht gespeichert werden",
    );
    expect(foreignBody).not.toContain(privateTitle);
    expect(await record(owner, id)).toEqual(original);
    expect(await record(other, otherId)).toEqual(otherOriginal);
    await foreign.dispose();

    // Missing identity and a forged owner claim must both fail at the Action entry.
    for (const forged of [false, true]) {
      if (forged) {
        const tokenName = (await context.cookies())
          .find((cookie) => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name))
          ?.name.replace(/\.\d+$/, "");
        if (!tokenName)
          throw new Error("Expected the owner's auth cookie name.");
        const expires = Math.floor(Date.now() / 1000) + 3600;
        const encode = (value: unknown) =>
          Buffer.from(JSON.stringify(value)).toString("base64url");
        await anonymousContext.addCookies([
          {
            name: tokenName,
            domain: new URL(replay.url).hostname,
            path: "/",
            value:
              "base64-" +
              encode({
                access_token: [
                  encode({ alg: "HS256", typ: "JWT" }),
                  encode({ sub: owner.id, exp: expires }),
                  "invalid-test-signature",
                ].join("."),
                refresh_token: "invalid-test-refresh",
                expires_at: expires,
                user: { id: owner.id },
              }),
          },
        ]);
      }
      const denied = await anonymousContext.request.post(
        replay.url,
        replay.options,
      );
      expect(denied.status()).toBe(200);
      expect(denied.headers()["x-action-redirect"]).toMatch(
        /^\/auth\/login(?:;|$)/,
      );
      expect(await denied.text()).not.toContain(privateTitle);
      expect(await record(owner, id)).toEqual(original);
      expect(await record(other, otherId)).toEqual(otherOriginal);
      await denied.dispose();
    }

    const allowed = await context.request.post(replay.url, replay.options);
    expect(allowed.status()).toBe(200);
    expect(allowed.headers()["x-action-redirect"]).toMatch(
      /^\/account\/plan\?/,
    );
    const completed = await record(owner, id);
    expect(completed).toEqual({
      ...original,
      revision: original.revision + 1,
      completed_at: expect.any(String),
    });
    expect(await record(other, otherId)).toEqual(otherOriginal);
    await allowed.dispose();
  } finally {
    await Promise.all([
      foreignContext.close(),
      anonymousContext.close(),
      ...accounts.map((user) => removeFixture(user.id)),
    ]);
  }
});
