import { expect, test } from "@playwright/test";
import { capturedAction } from "../server-actions";
import { createFixture, removeFixture } from "../supabase/fixtures";

test("logout blocks a captured profile action and a form left open in another tab", async ({
  page,
  context,
}) => {
  const user = await createFixture();
  try {
    await page.goto("/auth/login");
    await page.getByLabel("E-Mail-Adresse").fill(user.email);
    await page.getByLabel("Passwort", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page).toHaveURL("/account");
    await page.getByLabel("Anzeigename").fill("Erlaubte Änderung");

    const pendingAction = page.waitForRequest(
      (request) =>
        request.method() === "POST" && !!request.headers()["next-action"],
    );
    await page.getByRole("button", { name: "Profil speichern" }).click();
    const action = await pendingAction;
    await expect(page.getByRole("status")).toHaveText(
      "Dein Profil wurde gespeichert.",
    );

    // The API context uses the browser's current cookie jar, including logout.
    const replay = capturedAction(action);
    const protectedName = "Geschützter Stand";
    async function setProtectedName() {
      const { error } = await user.client
        .from("profiles")
        .update({ display_name: protectedName })
        .eq("user_id", user.id);
      expect(error).toBeNull();
    }
    async function savedName() {
      // Independent ordinary-user session verifies actual database persistence.
      const { data, error } = await user.client
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();
      expect(error).toBeNull();
      return data?.display_name;
    }

    // Positive control: the exact captured POST really can write while signed in.
    await setProtectedName();
    const allowed = await context.request.post(replay.url, replay.options);
    expect(allowed.status()).toBe(200);
    expect(await savedName()).toBe("Erlaubte Änderung");
    await allowed.dispose();
    await setProtectedName();

    const staleTab = await context.newPage();
    await staleTab.goto("/account");
    await expect(staleTab.getByLabel("Anzeigename")).toHaveValue(protectedName);
    await staleTab.getByLabel("Anzeigename").fill("Änderung nach Abmeldung");
    await page.getByRole("button", { name: "Abmelden", exact: true }).click();
    await expect(page).toHaveURL("/auth/login");

    const denied = await context.request.post(replay.url, replay.options);
    // Next fetch actions return redirects through this header with HTTP 200.
    expect(denied.status()).toBe(200);
    expect(denied.headers()["x-action-redirect"]).toMatch(
      /^\/auth\/login(?:;|$)/,
    );
    expect(await savedName()).toBe(protectedName);
    await denied.dispose();

    await staleTab.getByRole("button", { name: "Profil speichern" }).click();
    await expect(staleTab).toHaveURL("/auth/login");
    expect(await savedName()).toBe(protectedName);
    await staleTab.close();
  } finally {
    await removeFixture(user.id);
  }
});
