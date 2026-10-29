import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  check,
  read,
  same,
  withIsolatedDatabase,
} from "./isolated-database.mjs";
import { rehearseExistingData } from "./migration-scenario.mjs";

await withIsolatedDatabase("migration-cli", async (context) => {
  const { sql, source, cliConnection, setPhase, migrations } = context;
  const parent = realpathSync(tmpdir());
  const workspace = realpathSync(
    mkdtempSync(join(parent, "lifeos-migration-cli-")),
  );
  const migrationPath = join(workspace, "supabase", "migrations");
  // Pass only OS startup variables, never inherited provider/DB/CLI overrides.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      /^(path|systemroot|windir|temp|tmp|home|userprofile|appdata|localappdata)$/i.test(
        key,
      ),
    ),
  );
  const cli = fileURLToPath(
    new URL("../node_modules/supabase/dist/supabase.js", import.meta.url),
  );
  function up(expectSuccess = true) {
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "migration",
        "up",
        "--db-url",
        cliConnection(),
        "--workdir",
        workspace,
        "--yes",
      ],
      {
        cwd: workspace,
        env,
        input: "",
        encoding: "utf8",
        windowsHide: true,
        timeout: 60000,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    // Never surface raw CLI output, its errors or connection arguments.
    check(
      !result.error &&
        result.signal === null &&
        Number.isInteger(result.status),
      "CLI did not complete normally",
    );
    check(
      expectSuccess ? result.status === 0 : result.status !== 0,
      expectSuccess
        ? "CLI migration failed"
        : "Faulty migration unexpectedly succeeded",
    );
  }
  const history = () =>
    sql(
      source,
      "select jsonb_agg(to_jsonb(m) order by version) from supabase_migrations.schema_migrations m;",
    );
  try {
    mkdirSync(migrationPath, { recursive: true });
    writeFileSync(
      join(workspace, "supabase", "config.toml"),
      'project_id = "lifeos-cli-rehearsal"\n',
    );
    check(
      sql(source, "select to_regnamespace('supabase_migrations') is null;") ===
        "t",
      "CLI must create its own migration history",
    );
    const { snapshot, before } = await rehearseExistingData({
      ...context,
      apply: (files) => {
        setPhase("Supabase CLI migration batch");
        for (const filename of files)
          writeFileSync(
            join(migrationPath, filename),
            read(`supabase/migrations/${filename}`),
          );
        up();
      },
    });
    setPhase("CLI no-op verification");
    const completed = history();
    up();
    same(history(), completed, "No-op changed migration history");
    same(snapshot(), before, "No-op changed legacy data");

    // Only a temporary test migration, never added to repository migrations.
    const version = "20990101000000";
    check(
      migrations.every((file) => file.slice(0, 14) < version),
      "Review synthetic migration version",
    );
    const probe = join(migrationPath, `${version}_recovery_probe.sql`);
    const valid =
      "create schema lifeos_migration_probe;\ncreate table lifeos_migration_probe.marker (id integer primary key);\ninsert into lifeos_migration_probe.marker values (1);\n";
    writeFileSync(probe, `${valid}select 1 / 0;\n`);
    setPhase("deliberate CLI failure and rollback verification");
    up(false);
    same(history(), completed, "Failed migration changed history");
    check(
      sql(
        source,
        "select to_regnamespace('lifeos_migration_probe') is null;",
      ) === "t",
      "Failed migration left partial schema changes",
    );
    same(snapshot(), before, "Failed migration changed legacy data");

    writeFileSync(probe, valid);
    setPhase("corrected temporary migration and repeat verification");
    up();
    check(
      sql(
        source,
        "select count(*) from lifeos_migration_probe.marker where id=1;",
      ) === "1",
      "Corrected migration marker missing",
    );
    check(
      sql(
        source,
        `select count(*) from supabase_migrations.schema_migrations where version='${version}';`,
      ) === "1",
      "Corrected migration history missing",
    );
    const repaired = history();
    up();
    same(history(), repaired, "Repeated migration changed history");
    check(
      sql(source, "select count(*) from lifeos_migration_probe.marker;") ===
        "1",
      "Repeated migration duplicated data",
    );
    same(snapshot(), before, "Recovery changed legacy data");
    console.log(
      `CLI migration passed: ${migrations.length} repository migrations, three legacy accounts, no-op, deliberate failure rollback and corrected retry verified.`,
    );
  } finally {
    check(
      realpathSync(workspace) === workspace &&
        dirname(workspace) === parent &&
        basename(workspace).startsWith("lifeos-migration-cli-"),
      "Temporary workspace cleanup refused",
    );
    rmSync(workspace, { recursive: true, force: true });
  }
});
