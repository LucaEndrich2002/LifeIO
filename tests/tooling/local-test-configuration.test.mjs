import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { inspect } from "node:util";
import { test } from "node:test";
import {
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseLocalTestConfiguration } from "../../scripts/local-test-configuration.mjs";

const canary = "fictional-secret-must-not-escape";
const legacy = {
  API_URL: "http://127.0.0.1:54321",
  ANON_KEY: "fictional-anon-key",
  SERVICE_ROLE_KEY: canary,
  INBUCKET_URL: "http://localhost:54324",
  DB_PASSWORD: "unused-fictional-database-password",
};
const expected = {
  url: legacy.API_URL,
  key: legacy.ANON_KEY,
  serviceKey: canary,
  mailUrl: legacy.INBUCKET_URL,
};
const safeMessage =
  "Invalid local Supabase test configuration. Values and CLI output withheld.";

test("accepts legacy CLI fields and omits unrelated privileged values", () => {
  assert.deepEqual(
    parseLocalTestConfiguration(JSON.stringify(legacy)),
    expected,
  );
});

test("prefers current CLI credentials and mail URL, including IPv6 loopback", () => {
  assert.deepEqual(
    parseLocalTestConfiguration(
      JSON.stringify({
        ...legacy,
        PUBLISHABLE_KEY: "sb_publishable_fictional",
        SECRET_KEY: "sb_secret_fictional",
        MAILPIT_URL: "http://[::1]:54324/",
      }),
    ),
    {
      ...expected,
      key: "sb_publishable_fictional",
      serviceKey: "sb_secret_fictional",
      mailUrl: "http://[::1]:54324",
    },
  );
});

for (const [label, value] of [
  ["malformed JSON", canary],
  ["null or array status", "null"],
  ["array status", "[]"],
  ["invalid URL", JSON.stringify({ ...legacy, API_URL: canary })],
  [
    "remote API",
    JSON.stringify({ ...legacy, API_URL: "https://example.test" }),
  ],
  [
    "remote mailbox",
    JSON.stringify({ ...legacy, INBUCKET_URL: "https://example.test" }),
  ],
  [
    "URL credentials",
    JSON.stringify({
      ...legacy,
      API_URL: `http://user:${canary}@127.0.0.1:54321`,
    }),
  ],
  [
    "URL query",
    JSON.stringify({
      ...legacy,
      INBUCKET_URL: `http://localhost:54324/?token=${canary}`,
    }),
  ],
  [
    "URL fragment",
    JSON.stringify({ ...legacy, API_URL: `http://localhost:54321/#${canary}` }),
  ],
  [
    "URL path",
    JSON.stringify({ ...legacy, API_URL: "http://localhost:54321/private" }),
  ],
  [
    "non-HTTP protocol",
    JSON.stringify({ ...legacy, INBUCKET_URL: "ftp://localhost:54324" }),
  ],
  ["missing key", JSON.stringify({ ...legacy, SERVICE_ROLE_KEY: undefined })],
  [
    "non-string key",
    JSON.stringify({ ...legacy, ANON_KEY: { secret: canary } }),
  ],
  ["empty preferred key", JSON.stringify({ ...legacy, PUBLISHABLE_KEY: "" })],
  [
    "control character in key",
    JSON.stringify({ ...legacy, SECRET_KEY: `${canary}\n` }),
  ],
]) {
  test(`rejects ${label} without retaining input in the error`, () => {
    assert.throws(
      () => parseLocalTestConfiguration(value),
      (error) => {
        assert.equal(error.message, safeMessage);
        assert.equal(error.cause, undefined);
        assert.equal(inspect(error).includes(canary), false);
        return true;
      },
    );
  });
}

test("the real test runner fails closed without leaking subprocess output or starting tests", () => {
  // Run the real wrapper against two tiny local CLI/runner substitutes. No Docker,
  // network, accounts or provider are touched; all environment values are fictional.
  const temporaryRoot = realpathSync(tmpdir());
  const directory = mkdtempSync(join(temporaryRoot, "lifeos-config-test-"));
  const wrapper = fileURLToPath(
    new URL("../../scripts/test-supabase.mjs", import.meta.url),
  );
  try {
    const cli = join(directory, "node_modules/supabase/dist/supabase.js");
    const runner = join(directory, "node_modules/vitest/vitest.mjs");
    mkdirSync(dirname(cli), { recursive: true });
    mkdirSync(dirname(runner), { recursive: true });
    writeFileSync(
      cli,
      "process.stdout.write(process.env.FIXTURE_STATUS); process.stderr.write(process.env.FIXTURE_STDERR || ''); process.exit(Number(process.env.FIXTURE_EXIT || 0));",
    );
    writeFileSync(
      runner,
      "console.log(JSON.stringify({started:true,providerDisabled:process.env.OPENAI_API_KEY === '' && process.env.OPENAI_MODEL === '',hasFixtureKey:process.env.LIFEOS_TEST_SERVICE_KEY === 'fictional-secret-must-not-escape'}));",
    );
    const run = (output, overrides = {}) =>
      spawnSync(process.execPath, [wrapper, "integration"], {
        cwd: directory,
        encoding: "utf8",
        timeout: 15000,
        windowsHide: true,
        env: {
          ...process.env,
          DOCKER_CONTEXT: "",
          DOCKER_HOST: "tcp://127.0.0.1:2375",
          OPENAI_API_KEY: canary,
          OPENAI_MODEL: "fictional-model",
          FIXTURE_STATUS: output,
          FIXTURE_STDERR: "",
          FIXTURE_EXIT: "0",
          ...overrides,
        },
      });
    for (const output of [
      canary,
      JSON.stringify({ ...legacy, API_URL: canary }),
      JSON.stringify({ ...legacy, INBUCKET_URL: "https://example.test" }),
    ]) {
      const result = run(output);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.ok(result.stderr.includes(safeMessage));
      assert.equal(result.stderr.includes(canary), false);
    }
    const failedCli = run(canary, {
      FIXTURE_EXIT: "1",
      FIXTURE_STDERR: canary,
    });
    assert.equal(failedCli.status, 1);
    assert.equal((failedCli.stdout + failedCli.stderr).includes(canary), false);
    const valid = run(JSON.stringify(legacy));
    assert.equal(valid.status, 0);
    assert.deepEqual(JSON.parse(valid.stdout), {
      started: true,
      providerDisabled: true,
      hasFixtureKey: true,
    });
  } finally {
    const resolved = realpathSync(directory);
    assert.ok(resolved.startsWith(temporaryRoot + sep));
    assert.ok(
      resolved === directory &&
        directory.split(sep).at(-1).startsWith("lifeos-config-test-"),
    );
    rmSync(resolved, { recursive: true, force: true });
  }
});
