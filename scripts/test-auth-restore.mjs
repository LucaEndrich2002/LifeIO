import { randomUUID } from "node:crypto";
import {
  check,
  read,
  same,
  withIsolatedDatabase,
} from "./isolated-database.mjs";
import { prepareAuthSource, request, waitForAuth } from "./auth-rehearsal.mjs";
import { recoverySnapshot } from "./recovery-snapshot.mjs";
import { restoreArchive } from "./restore-archive.mjs";

await withIsolatedDatabase("auth-source", async (source) => {
  const { accounts, services: sourceServices } =
    await prepareAuthSource(source);
  source.setPhase("fictional application data and unconfirmed account");
  for (const account of accounts) {
    source.sql(
      source.source,
      `
      begin; set local role authenticated;
      set local request.jwt.claim.sub='${account.id}';
      select public.save_onboarding_step('income','{"decision":"saved","name":"Fiktives Einkommen","amount":280001,"month":"2026-10"}',0);
      commit;
    `,
    );
  }
  const unconfirmed = {
    email: `unconfirmed-${randomUUID()}@example.test`,
    password: `Fictional-${randomUUID()}!`,
  };
  const signup = await request(sourceServices.origin, "/signup", {
    body: unconfirmed,
  });
  check(
    signup.status === 200 &&
      !signup.data.access_token &&
      !signup.data.email_confirmed_at,
    "Third account must remain unconfirmed",
  );

  const snapshot = (context, database) =>
    recoverySnapshot(context.sql)(database);
  const before = snapshot(source, source.source);
  const roles = source.sql(
    source.source,
    read("tests/recovery/cluster-roles.sql"),
  );
  check(
    before.rows["auth.users"].length === 3 &&
      before.rows["public.incomes"].length === 2,
    "Missing Auth or application fixtures",
  );
  check(
    before.rows["supabase_migrations.schema_migrations"].length ===
      source.migrations.length,
    "Missing migration history",
  );
  const sourceSystemId = source.sql(
    source.source,
    "select system_identifier::text from pg_control_system();",
  );
  source.setPhase("logical Auth and application backup");
  source.docker([
    "exec",
    source.container,
    "pg_dump",
    "-U",
    "supabase_admin",
    "-d",
    source.source,
    "--format=custom",
    "--schema=public",
    "--schema=auth",
    "--schema=supabase_migrations",
    "--file=/tmp/lifeos-auth.dump",
  ]);
  const archive = source.docker(
    ["exec", source.container, "cat", "/tmp/lifeos-auth.dump"],
    { encoding: "buffer" },
  ).stdout;
  check(
    Buffer.isBuffer(archive) && archive.length > 1000,
    "Missing bounded backup archive",
  );
  source.sql(
    source.source,
    `update public.profiles set display_name='Nur in der Quelle' where user_id='${accounts[0].id}';`,
  );

  let targetPassed = false;
  await withIsolatedDatabase("auth-target", async (target) => {
    const database = target.target;
    target.setPhase("independent cluster and fresh role baseline");
    check(
      target.container !== source.container &&
        target.sql(
          target.source,
          "select system_identifier::text from pg_control_system();",
        ) !== sourceSystemId,
      "Restore requires an independent PostgreSQL cluster",
    );
    same(
      target.sql(target.source, read("tests/recovery/cluster-roles.sql")),
      roles,
      "Fresh role capabilities or memberships differ",
    );
    // Fresh image roles, not a pg_dumpall/global-role restore. No source role
    // passwords are copied. The target services get new ephemeral credentials.
    target.sql(
      target.source,
      `create database ${database} template template0 owner postgres;`,
    );
    // Retain initdb's public schema and its default ACL. pg_dump records changes
    // relative to that baseline; dropping it loses PUBLIC's default USAGE.
    const tableCount = () =>
      target.sql(
        database,
        "select count(*) from pg_tables where schemaname in ('public','auth','supabase_migrations');",
      );
    same(tableCount(), "0", "Target must start empty");
    const restoreArgs = [
      "exec",
      "-i",
      target.container,
      "pg_restore",
      "-U",
      "supabase_admin",
      "--dbname",
      database,
      "--exit-on-error",
      "--single-transaction",
    ];
    target.setPhase("rejection of truncated backup");
    const broken = target.docker(restoreArgs, {
      input: archive.subarray(0, 512),
      optional: true,
    });
    check(
      !broken.error && broken.status !== 0,
      "Truncated backup must fail explicitly",
    );
    same(tableCount(), "0", "Failed restore left application or Auth tables");
    target.setPhase(
      "independent restore with ownership and privileges preserved",
    );
    restoreArchive(target, database, archive);
    same(
      snapshot(target, database),
      before,
      "Restored data, definitions, owners or privileges differ (contents omitted)",
    );
    same(
      target.sql(database, read("tests/recovery/cluster-roles.sql")),
      roles,
      "Restore changed cluster role capabilities",
    );
    same(
      target.sql(
        database,
        `select display_name from public.profiles where user_id='${accounts[0].id}';`,
      ),
      "Fiktive Auth-Probe",
      "Source-only change leaked into target",
    );
    console.log(
      "Independent restore matches the backup, schema, owners, role capabilities and memberships; source-only changes are absent.",
    );

    target.setPhase("restored Auth and Data API startup");
    const services = target.startAuthServices(database);
    await waitForAuth(services);
    let restReady = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        const response = await request(
          services.restOrigin,
          "/profiles?select=user_id",
        );
        if (response.status === 401 && response.data.code === "42501") {
          restReady = true;
          break;
        }
      } catch {
        /* Readiness only; raw service errors are withheld. */
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    check(
      restReady,
      "Data API did not become ready with anonymous access denied",
    );
    async function login(account) {
      const response = await request(
        services.origin,
        "/token?grant_type=password",
        { body: { email: account.email, password: account.password } },
      );
      check(
        response.status === 200 &&
          response.data.user?.id === account.id &&
          response.data.user.email_confirmed_at &&
          typeof response.data.access_token === "string",
        "Restored confirmed account could not log in with its original password",
      );
      return response.data.access_token;
    }
    async function deniedLogin(credentials, code) {
      const response = await request(
        services.origin,
        "/token?grant_type=password",
        { body: credentials },
      );
      check(
        response.status === 400 &&
          response.data.error_code === code &&
          !response.data.access_token,
        "Invalid or unconfirmed login was not rejected correctly",
      );
    }
    target.setPhase("new target sessions and wrong/unconfirmed credentials");
    const tokens = [];
    for (const account of accounts) {
      tokens.push(await login(account));
      await deniedLogin(
        { email: account.email, password: `Wrong-${randomUUID()}` },
        "invalid_credentials",
      );
    }
    await deniedLogin(unconfirmed, "email_not_confirmed");
    const oldToken = await request(services.origin, "/user", {
      token: accounts[0].token,
    });
    check(
      oldToken.status === 403 && oldToken.data.error_code === "bad_jwt",
      "Source token must not validate with the independently generated target signing key",
    );
    const oldRest = await request(
      services.restOrigin,
      "/profiles?select=user_id",
      { token: accounts[0].token },
    );
    check(
      oldRest.status === 401 && oldRest.data.code === "PGRST301",
      "Data API accepted the source signing key",
    );

    target.setPhase("actual Data API owner and cross-user authorization");
    for (const [index, account] of accounts.entries()) {
      const token = tokens[index];
      const own = await request(
        services.restOrigin,
        "/profiles?select=user_id,display_name",
        { token },
      );
      same(
        own,
        {
          status: 200,
          data: [{ user_id: account.id, display_name: "Fiktive Auth-Probe" }],
        },
        "Data API profile isolation failed",
      );
      const incomes = await request(
        services.restOrigin,
        "/incomes?select=user_id,amount_minor,currency",
        { token },
      );
      same(
        incomes,
        {
          status: 200,
          data: [
            { user_id: account.id, amount_minor: 280001, currency: "EUR" },
          ],
        },
        "Restored financial fixture or owner isolation differs",
      );
      const foreignId = accounts[1 - index].id;
      const foreign = await request(
        services.restOrigin,
        `/profiles?user_id=eq.${foreignId}&select=user_id`,
        { token },
      );
      same(
        foreign,
        { status: 200, data: [] },
        "Data API exposed another profile",
      );
      const write = await request(
        services.restOrigin,
        `/profiles?user_id=eq.${foreignId}`,
        {
          token,
          method: "PATCH",
          prefer: "return=representation",
          body: { display_name: "Fremder Schreibversuch" },
        },
      );
      same(
        write,
        { status: 200, data: [] },
        "Data API changed another profile",
      );
      same(
        target.sql(
          database,
          `select display_name from public.profiles where user_id='${foreignId}';`,
        ),
        "Fiktive Auth-Probe",
        "Foreign write changed persisted profile",
      );
    }
    const ownerWrite = await request(
      services.restOrigin,
      `/profiles?user_id=eq.${accounts[0].id}&select=user_id,display_name`,
      {
        token: tokens[0],
        method: "PATCH",
        prefer: "return=representation",
        body: { display_name: "Im Ziel gespeichert" },
      },
    );
    same(
      ownerWrite,
      {
        status: 200,
        data: [
          { user_id: accounts[0].id, display_name: "Im Ziel gespeichert" },
        ],
      },
      "Owner positive write control failed",
    );
    same(
      source.sql(
        source.source,
        `select display_name from public.profiles where user_id='${accounts[0].id}';`,
      ),
      "Nur in der Quelle",
      "Target write leaked into source",
    );

    target.setPhase("target Auth restart and fresh password login");
    services.restartAuth();
    await waitForAuth(services);
    for (const account of accounts) await login(account);
    const retained = await request(services.origin, "/user", {
      token: tokens[0],
    });
    check(
      retained.status === 200 && retained.data.id === accounts[0].id,
      "Same-key restart lost the target session",
    );
    const persisted = await request(
      services.restOrigin,
      "/profiles?select=display_name",
      { token: tokens[0] },
    );
    same(
      persisted,
      { status: 200, data: [{ display_name: "Im Ziel gespeichert" }] },
      "Target write did not persist after restart",
    );
    targetPassed = true;
  });
  check(targetPassed, "Independent Auth target verification did not finish");
  console.log(
    "Auth restore passed: independent cluster, full scoped snapshot, rejected truncated archive, fresh logins, unconfirmed/wrong-password rejection, target JWT Data API isolation and owner write, Auth restart. Gateway/browser/cloud restore remains outside this probe.",
  );
});
