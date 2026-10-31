import { recoverySnapshot } from "./recovery-snapshot.mjs";
import { restoreArchive } from "./restore-archive.mjs";
import {
  check,
  read,
  same,
  withIsolatedDatabase,
} from "./isolated-database.mjs";

await withIsolatedDatabase(
  "restore",
  async ({
    sql,
    docker,
    container,
    source,
    target,
    migrations,
    migrate,
    setPhase,
  }) => {
    const snapshot = recoverySnapshot(sql);
    for (const filename of migrations) migrate(filename);
    setPhase("fictional data setup");
    sql(source, read("tests/recovery/fixtures.sql"));
    setPhase("source access controls");
    sql(source, read("tests/recovery/verify-access.sql"));
    const before = snapshot(source);
    check(
      before.catalog.relations.length === 15 &&
        before.catalog.functions.length === 28,
      "Review the application inventory before extending this rehearsal",
    );
    check(
      before.catalog.roles.every((role) => !role.superuser && !role.bypassRls),
      "API roles must not bypass RLS",
    );
    for (const relation of before.catalog.relations) {
      check(
        relation.rls && before.rows[`public.${relation.name}`]?.length >= 2,
        "Every application table must have RLS and populated two-user fixtures",
      );
    }
    check(
      before.rows["auth.users"]?.length === 2,
      "Expected exactly two fictional account references",
    );
    check(
      before.rows["supabase_migrations.schema_migrations"]?.length ===
        migrations.length,
      "Missing migration history",
    );
    console.log(
      "Isolated source prepared: 15 populated application tables, two fictional users, access controls verified.",
    );

    setPhase("logical backup");
    docker([
      "exec",
      container,
      "pg_dump",
      "-U",
      "supabase_admin",
      "-d",
      source,
      "--format=custom",
      "--schema=public",
      "--schema=auth",
      "--schema=supabase_migrations",
      "--file=/tmp/lifeos-rehearsal.dump",
    ]);
    setPhase("empty restore target");
    sql(source, `create database ${target} template template0 owner postgres;`);
    // Preserve initdb's public-schema ACL baseline for pg_restore.
    check(
      sql(
        target,
        "select count(*) from pg_tables where schemaname in ('public','auth','supabase_migrations');",
      ) === "0",
      "Restore target must be empty",
    );
    setPhase("restore into the empty database");
    const archive = docker(
      ["exec", container, "cat", "/tmp/lifeos-rehearsal.dump"],
      { encoding: "buffer" },
    ).stdout;
    restoreArchive({ sql, docker, container }, target, archive);
    setPhase("restored data, schema and privileges");
    same(
      snapshot(target),
      before,
      "Restored data, schema or privileges differ (contents omitted)",
    );
    setPhase("restored access controls and writable owner flow");
    sql(target, read("tests/recovery/verify-access.sql"));
    same(
      snapshot(target).rows,
      before.rows,
      "Access checks must roll back their test writes",
    );
    console.log(
      `Restore passed: all rows, schema definitions, constraints, indexes, triggers, rights and ${migrations.length} migration records match; owner/foreign/anonymous checks passed.`,
    );
  },
);
