-- Metadata only. Never select application rows, passwords or session material.
begin read only;
set local statement_timeout = '5s';
set local search_path = pg_catalog;

select jsonb_build_object(
  'roles', (
    select jsonb_agg(jsonb_build_object(
      'name', r.rolname,
      'superuser', r.rolsuper,
      'bypassRls', r.rolbypassrls,
      'createRole', r.rolcreaterole,
      'createDatabase', r.rolcreatedb,
      'replication', r.rolreplication,
      'createInPublic', has_schema_privilege(r.oid, 'public', 'CREATE'),
      'memberOf', (
        select coalesce(jsonb_agg(parent.rolname order by parent.rolname), '[]'::jsonb)
        from pg_roles parent where parent.oid <> r.oid and pg_has_role(r.oid, parent.oid, 'MEMBER')
      )
    ) order by r.rolname)
    from pg_roles r where r.rolname in ('anon', 'authenticated')
  ),
  'relations', (
    select jsonb_agg(jsonb_build_object(
      'name', c.relname,
      'kind', c.relkind,
      'owner', pg_get_userbyid(c.relowner),
      'rls', c.relrowsecurity,
      'ownerColumnRequired', exists (
        select 1 from pg_attribute a where a.attrelid = c.oid
          and a.attname = 'user_id' and a.atttypid = 'uuid'::regtype
          and a.attnotnull and not a.attisdropped
      ),
      'access', (
        select jsonb_agg(jsonb_build_object(
          'role', r.rolname,
          'tablePrivileges', (
            select coalesce(jsonb_agg(privilege || suffix order by privilege, suffix), '[]'::jsonb)
            from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege
            cross join (values (''), (' WITH GRANT OPTION')) options(suffix)
            where has_table_privilege(r.oid, c.oid, privilege || suffix)
          ),
          'columnPrivileges', (
            select coalesce(jsonb_agg(a.attname || ':' || privilege || suffix order by a.attname, privilege, suffix), '[]'::jsonb)
            from pg_attribute a cross join unnest(array['SELECT','INSERT','UPDATE','REFERENCES']) privilege
            cross join (values (''), (' WITH GRANT OPTION')) options(suffix)
            where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
              and has_column_privilege(r.oid, c.oid, a.attnum, privilege || suffix)
          )
        ) order by r.rolname)
        from pg_roles r where r.rolname in ('anon', 'authenticated')
      ),
      'policies', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'name', p.polname,
          'command', p.polcmd,
          'permissive', p.polpermissive,
          'roles', (select jsonb_agg(case when role_oid = 0 then 'PUBLIC' else pg_get_userbyid(role_oid) end order by role_oid) from unnest(p.polroles) role_oid),
          'using', pg_get_expr(p.polqual, p.polrelid),
          'check', pg_get_expr(p.polwithcheck, p.polrelid)
        ) order by p.polname), '[]'::jsonb)
        from pg_policy p where p.polrelid = c.oid
      )
    ) order by c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p','v','m','f','S')
  ),
  'functions', (
    select jsonb_agg(jsonb_build_object(
      'signature', p.proname || '(' || oidvectortypes(p.proargtypes) || ')',
      'owner', pg_get_userbyid(p.proowner),
      'definer', p.prosecdef,
      'kind', p.prokind,
      'configuration', coalesce(to_jsonb(p.proconfig), '[]'::jsonb),
      'result', pg_get_function_result(p.oid),
      'anonymousExecute', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'authenticatedExecute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      'authenticatedGrant', has_function_privilege('authenticated', p.oid, 'EXECUTE WITH GRANT OPTION')
    ) order by p.proname, p.oid)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  )
);
commit;
