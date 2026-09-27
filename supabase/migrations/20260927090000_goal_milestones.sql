create table public.goal_milestones (
  id uuid primary key,
  user_id uuid not null,
  goal_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  removed_at timestamptz,
  foreign key (user_id, goal_id) references public.goals(user_id, id) on delete cascade
);
create index goal_milestones_owner_goal on public.goal_milestones(user_id, goal_id, created_at, id) where removed_at is null;
alter table public.goal_milestones enable row level security;
revoke all on public.goal_milestones from public, anon, authenticated;
grant select on public.goal_milestones to authenticated;
create policy goal_milestones_select_own on public.goal_milestones for select to authenticated
  using (user_id = (select auth.uid()) and removed_at is null);

create function public.mutate_goal_milestone(p_operation text, p_goal_id uuid, p_id uuid, p_revision integer, p_title text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); entry public.goal_milestones%rowtype; title_value text;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_operation is null or p_operation not in ('create','rename','complete','reopen','remove')
    or p_goal_id is null or p_id is null or p_revision is null or p_revision not between 0 and 2147483646
    then raise exception 'Invalid request' using errcode = '22023'; end if;
  -- Follow the lock order of onboarding and goal mutations.
  perform 1 from public.profiles where user_id = owner_id for share;
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  perform 1 from public.goals where user_id = owner_id and id = p_goal_id for update;
  if not found then raise exception 'Goal unavailable' using errcode = '42501'; end if;
  select * into entry from public.goal_milestones where user_id = owner_id and goal_id = p_goal_id and id = p_id for update;
  if p_operation in ('create','rename') then
    -- Match JavaScript String.trim, including non-breaking Unicode whitespace.
    title_value := btrim(p_title, U&'\0009\000a\000b\000c\000d\0020\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff');
    if title_value is null or char_length(title_value) not between 1 and 80 then raise exception 'Invalid title' using errcode = '22023'; end if;
  end if;
  if p_operation = 'create' then
    if p_revision <> 0 then raise exception 'Invalid revision' using errcode = '22023'; end if;
    if entry.id is not null then
      if entry.removed_at is null and entry.revision = 0 and entry.title = title_value then return; end if;
      raise exception 'Milestone already exists' using errcode = '40001';
    end if;
    insert into public.goal_milestones(id,user_id,goal_id,title) values(p_id,owner_id,p_goal_id,title_value);
    return;
  end if;
  if entry.id is null then raise exception 'Milestone unavailable' using errcode = '42501'; end if;
  if entry.removed_at is not null then
    if p_operation = 'remove' then return; end if;
    raise exception 'Milestone unavailable' using errcode = '42501';
  end if;
  -- Desired states make repeated submissions safe; this is not a blind toggle.
  if (p_operation = 'complete' and entry.completed_at is not null)
    or (p_operation = 'reopen' and entry.completed_at is null) then return; end if;
  if entry.revision <> p_revision then raise exception 'Stale milestone' using errcode = '40001'; end if;
  update public.goal_milestones set
    title = case when p_operation = 'rename' then title_value else title end,
    completed_at = case when p_operation = 'complete' then now() when p_operation = 'reopen' then null else completed_at end,
    removed_at = case when p_operation = 'remove' then now() else removed_at end,
    revision = revision + 1
    where user_id = owner_id and goal_id = p_goal_id and id = p_id;
end; $$;
revoke all on function public.mutate_goal_milestone(text,uuid,uuid,integer,text) from public, anon, authenticated;
grant execute on function public.mutate_goal_milestone(text,uuid,uuid,integer,text) to authenticated;

create function public.read_goal_milestones(p_goal_id uuid, p_page integer default 0) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_goal_id is null or p_page is null or p_page not between 0 and 1000000 then raise exception 'Invalid request' using errcode = '22023'; end if;
  with entries as (
    select id,title,revision,created_at,completed_at from public.goal_milestones
      where user_id = auth.uid() and goal_id = p_goal_id and removed_at is null
  ), page as (select * from entries order by created_at desc,id limit 25 offset p_page * 25)
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc,id) from page p),'[]'::jsonb),
    'total',(select count(*) from entries),
    'completed',(select count(*) from entries where completed_at is not null)
  ) into result from public.goals where user_id = auth.uid() and id = p_goal_id;
  return result;
end; $$;
revoke all on function public.read_goal_milestones(uuid,integer) from public, anon, authenticated;
grant execute on function public.read_goal_milestones(uuid,integer) to authenticated;
