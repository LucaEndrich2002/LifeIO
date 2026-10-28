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
    function catalog(database) {
      return JSON.parse(
        sql(database, read("tests/supabase/security-catalog.sql")),
      );
    }
    function rows(database) {
      const tables = JSON.parse(
        sql(
          database,
          `
    select jsonb_agg(n.nspname || '.' || c.relname order by n.nspname,c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','auth','supabase_migrations') and c.relkind='r';
  `,
        ),
      );
      return Object.fromEntries(
        tables.map((table) => {
          check(
            /^(public|auth|supabase_migrations)\.[a-z_][a-z0-9_]*$/.test(table),
            "Unexpected table",
          );
          const value = JSON.parse(
            sql(
              database,
              `select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from ${table} t;`,
            ),
          );
          return [table, value];
        }),
      );
    }
    function schema(database) {
      return JSON.parse(sql(database, read("tests/recovery/schema.sql")));
    }
    for (const filename of migrations) migrate(filename);
    setPhase("fictional data setup");
    sql(source, read("tests/recovery/fixtures.sql"));
    setPhase("source access controls");
    sql(source, read("tests/recovery/verify-access.sql"));
    const before = {
      catalog: catalog(source),
      rows: rows(source),
      schema: schema(source),
    };
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
    sql(target, "drop schema public;");
    check(
      sql(
        target,
        "select count(*) from pg_tables where schemaname in ('public','auth','supabase_migrations');",
      ) === "0",
      "Restore target must be empty",
    );
    setPhase("restore into the empty database");
    docker([
      "exec",
      container,
      "pg_restore",
      "-U",
      "supabase_admin",
      "--dbname",
      target,
      "--exit-on-error",
      "--single-transaction",
      "/tmp/lifeos-rehearsal.dump",
    ]);
    setPhase("restored data, schema and privileges");
    same(rows(target), before.rows, "Restored rows differ (contents omitted)");
    same(catalog(target), before.catalog, "Restored privileges differ");
    same(
      schema(target),
      before.schema,
      "Restored definitions or constraints differ",
    );
    setPhase("restored access controls and writable owner flow");
    sql(target, read("tests/recovery/verify-access.sql"));
    same(
      rows(target),
      before.rows,
      "Access checks must roll back their test writes",
    );
    console.log(
      `Restore passed: all rows, schema definitions, constraints, indexes, triggers, rights and ${migrations.length} migration records match; owner/foreign/anonymous checks passed.`,
    );
  },
);
