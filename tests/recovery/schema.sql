-- Only the disposable rehearsal databases call this query. Reparse CHECKs
-- through PostgreSQL itself: BETWEEN expansion can otherwise deparse as nested
-- AND on the source and flattened AND after pg_restore. Never strip parentheses
-- or other SQL syntax in JavaScript to make a failing comparison pass.
-- Temporary constraints and any DDL side effects are rolled back below.
begin;
set local statement_timeout = '15s';
create temporary table restore_constraint_definitions(table_name text, name text, definition text);
do $$
declare entry record; definition text;
begin
  for entry in select c.oid,c.conrelid,c.conname,c.contype from pg_constraint c
    join pg_namespace n on n.oid=c.connamespace
    where n.nspname in ('public','auth','supabase_migrations') order by c.oid
  loop
    definition := pg_get_constraintdef(entry.oid);
    if entry.contype='c' then
      execute format('alter table %s add constraint lifeos_rehearsal_canonical_check %s',entry.conrelid::regclass,definition);
      select pg_get_constraintdef(c.oid) into strict definition from pg_constraint c
        where c.conrelid=entry.conrelid and c.conname='lifeos_rehearsal_canonical_check';
      execute format('alter table %s drop constraint lifeos_rehearsal_canonical_check',entry.conrelid::regclass);
    end if;
    insert into restore_constraint_definitions values(entry.conrelid::regclass::text,entry.conname,definition);
  end loop;
end $$;
select jsonb_build_object(
  'constraints', (select jsonb_agg(jsonb_build_array(table_name,name,definition) order by table_name,name) from restore_constraint_definitions),
  'indexes', (select jsonb_agg(jsonb_build_array(schemaname,tablename,indexname,indexdef) order by schemaname,tablename,indexname)
    from pg_indexes where schemaname in ('public','auth','supabase_migrations')),
  'triggers', (select jsonb_agg(jsonb_build_array(t.tgrelid::regclass::text,t.tgname,pg_get_triggerdef(t.oid)) order by t.tgrelid::regclass::text,t.tgname)
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','auth') and not t.tgisinternal),
  'functions', (select jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,pg_get_functiondef(p.oid)) order by p.oid::regprocedure::text)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','auth') and p.prokind='f')
);
rollback;
