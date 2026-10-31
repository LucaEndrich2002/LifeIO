-- A NULL ACL means PostgreSQL defaults, not absence of privileges.
-- pg_restore can emit identical grants in a different order. Compare the full
-- sorted ACL entries, retaining grantee, grantor, privileges and grant options.
select jsonb_build_object(
  'schemas', (select jsonb_agg(jsonb_build_array(nspname,pg_get_userbyid(nspowner),(select jsonb_agg(a::text order by a::text) from unnest(coalesce(nspacl,acldefault('n',nspowner))) a)) order by nspname) from pg_namespace where nspname in ('public','auth','supabase_migrations')),
  'relations', (select jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner),(select jsonb_agg(a::text order by a::text) from unnest(coalesce(c.relacl,acldefault((case when c.relkind='S' then 's' else 'r' end)::"char",c.relowner))) a),c.relrowsecurity,c.relforcerowsecurity) order by n.nspname,c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','supabase_migrations')),
  'functions', (select jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,pg_get_userbyid(p.proowner),(select jsonb_agg(a::text order by a::text) from unnest(coalesce(p.proacl,acldefault('f',p.proowner))) a)) order by p.oid::regprocedure::text)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','auth','supabase_migrations'))
);
