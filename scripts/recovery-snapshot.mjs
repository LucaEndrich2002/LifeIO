import { check, read } from "./isolated-database.mjs";

export function recoverySnapshot(sql) {
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

  return (database) => ({
    catalog: catalog(database),
    rows: rows(database),
    schema: schema(database),
    owners: JSON.parse(sql(database, read("tests/recovery/object-owners.sql"))),
  });
}
