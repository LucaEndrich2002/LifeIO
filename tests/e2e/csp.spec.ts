import { expect, test } from "@playwright/test";
import { documentPolicy, observePolicyViolations } from "../csp";

test("each document and 404 has a fresh policy, matching scripts and a working theme", async ({
  page,
}) => {
  const violations = await observePolicyViolations(page);
  const nonces = new Set<string>();
  for (const path of [
    "/",
    "/money",
    "/plan",
    "/goals",
    "/ai",
    "/does-not-exist",
  ]) {
    const nonce = documentPolicy(await page.goto(path));
    expect(nonces.has(nonce)).toBe(false);
    nonces.add(nonce);
    const scripts = await page
      .locator("script")
      .evaluateAll((elements) => elements.map((element) => element.nonce));
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.every((value) => value === nonce)).toBe(true);
  }
  await page.getByRole("link", { name: "Zur Startseite", exact: true }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.getByRole("button", { name: "Farbschema wechseln" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("link", { name: "Money", exact: true })
    .click();
  await expect(page).toHaveURL("/money");
  await page.getByRole("button", { name: "Farbschema wechseln" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  expect(violations).toEqual([]);
});

test("the browser blocks injected scripts, handlers, styles and external connections", async ({
  page,
}) => {
  const violations = await observePolicyViolations(page);
  const outgoing: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://lifeos-csp.invalid/"))
      outgoing.push(request.url());
  });
  // Defense in depth: never actually send the synthetic request if CSP regresses.
  await page.route("https://lifeos-csp.invalid/**", (route) => route.abort());
  // Inject through the HTML parser, not the automation execution context.
  // This models untrusted markup reaching a real response with its real policy.
  await page.route("http://127.0.0.1:3100/", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      "</head>",
      `<script>document.documentElement.dataset.cspScript = "ran"</script>
       <script nonce="not-the-document-nonce">document.documentElement.dataset.cspScript = "ran"</script>
       </head>`,
    );
    await route.fulfill({ response, body });
  });
  documentPolicy(await page.goto("/"));
  const result = await page.evaluate(async () => {
    const probe = document.createElement("button");
    probe.id = "csp-probe";
    probe.textContent = "CSP test";
    document.body.append(probe);
    probe.setAttribute("onclick", 'this.dataset.handler = "ran"');
    probe.click();
    const style = document.createElement("style");
    style.textContent = "#csp-probe { --injected: yes; }";
    document.head.append(style);
    const fetched = await fetch("https://lifeos-csp.invalid/probe").then(
      () => true,
      () => false,
    );
    return {
      script: document.documentElement.dataset.cspScript ?? null,
      handler: probe.dataset.handler ?? null,
      style: getComputedStyle(probe).getPropertyValue("--injected"),
      fetched,
    };
  });
  expect(result).toEqual({
    script: null,
    handler: null,
    style: "",
    fetched: false,
  });
  await expect
    .poll(() => violations)
    .toEqual(
      expect.arrayContaining([
        "script-src-elem",
        "script-src-attr",
        "style-src-elem",
        "connect-src",
      ]),
    );
  expect(outgoing).toEqual([]);
  expect(
    violations.filter((directive) => directive === "script-src-elem"),
  ).toHaveLength(2);
});
