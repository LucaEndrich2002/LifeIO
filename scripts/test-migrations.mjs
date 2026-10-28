import {
  check,
  read,
  same,
  withIsolatedDatabase,
} from "./isolated-database.mjs";

await withIsolatedDatabase(
  "migration",
  async ({ sql, source, migrations, migrate, setPhase }) => {
    const boundary = migrations.indexOf("20260926160000_savings_goals.sql");
    check(
      boundary === 4,
      "Review the legacy migration boundary before changing this rehearsal",
    );
    for (const filename of migrations.slice(0, boundary)) migrate(filename);
    setPhase("legacy fictional data setup");
    check(
      sql(source, "select to_regclass('public.goal_rates') is null;") === "t",
      "Fixtures must precede savings rates",
    );
    sql(source, read("tests/migrations/legacy-fixtures.sql"));

    // Capture the old columns before upgrading, so new columns cannot mask changes
    // to IDs, owners, dates, balances, statuses or any other existing field.
    const tables = [
      "profiles",
      "onboarding",
      "incomes",
      "expenses",
      "budgets",
      "goals",
    ];
    const queries = tables.map((table) => {
      const columns = JSON.parse(
        sql(
          source,
          `select jsonb_agg(attname order by attnum) from pg_attribute where attrelid='public.${table}'::regclass and attnum>0 and not attisdropped;`,
        ),
      );
      check(
        columns.every((column) => /^[a-z_][a-z0-9_]*$/.test(column)),
        "Unexpected legacy column",
      );
      return `select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from (select ${columns.join(",")} from public.${table}) t;`;
    });
    const snapshot = () =>
      queries.map((query) => JSON.parse(sql(source, query)));
    const before = snapshot();
    same(
      before.map((rows) => rows.length),
      [3, 3, 3, 3, 0, 2],
      "Legacy fixtures incomplete",
    );

    for (const filename of migrations.slice(boundary)) {
      migrate(filename);
      // Verify both the original backfill/trigger and their final V1 replacements.
      if (filename === migrations[boundary] || filename === migrations.at(-1)) {
        setPhase("legacy data preservation");
        same(
          snapshot(),
          before,
          "Existing data changed during upgrade (contents omitted)",
        );
        setPhase("savings backfill, resumed setup and owner isolation");
        sql(source, read("tests/migrations/verify-savings.sql"));
        same(snapshot(), before, "Access and write probes must roll back");
      }
    }
    setPhase("migration history verification");
    same(
      JSON.parse(
        sql(
          source,
          "select jsonb_agg(version order by version) from supabase_migrations.schema_migrations;",
        ),
      ),
      migrations.map((filename) => filename.slice(0, 14)),
      "Migration history incomplete",
    );
    console.log(
      `Migration passed: three legacy accounts preserved through ${migrations.length} SQL files; savings backfill, resumed setup, historical rates and owner/foreign/anonymous controls verified at both checkpoints.`,
    );
  },
);
