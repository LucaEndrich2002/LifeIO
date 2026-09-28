create table public.tasks (
  id uuid primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  priority text not null check (priority in ('high','normal','low')),
  due_on date check (due_on between date '2000-01-01' and date '2100-12-31'),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  removed_at timestamptz
);
create index tasks_owner_due on public.tasks(user_id,due_on,id) where removed_at is null;
alter table public.tasks enable row level security;
revoke all on public.tasks from public,anon,authenticated;
grant select on public.tasks to authenticated;
create policy tasks_select_own on public.tasks for select to authenticated
  using (user_id = (select auth.uid()) and removed_at is null);

create function public.mutate_task(p_operation text,p_id uuid,p_revision integer,p_title text default '',p_priority text default 'normal',p_due_on text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); entry public.tasks%rowtype; title_value text; due date;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_operation is null or p_operation not in ('create','update','complete','reopen','remove') or p_id is null
    or p_revision is null or p_revision not between 0 and 2147483646
    then raise exception 'Invalid request' using errcode = '22023'; end if;
  perform 1 from public.profiles where user_id = owner_id for share;
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  select * into entry from public.tasks where user_id = owner_id and id = p_id for update;
  if p_operation in ('create','update') then
    title_value := btrim(p_title, U&'\0009\000a\000b\000c\000d\0020\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff');
    if title_value is null or char_length(title_value) not between 1 and 80 or p_priority is null or p_priority not in ('high','normal','low') or p_due_on is null
      then raise exception 'Invalid task' using errcode = '22023'; end if;
    if p_due_on <> '' then
      if p_due_on !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])-[0-9]{2}$' then raise exception 'Invalid due day' using errcode = '22023'; end if;
      due := p_due_on::date;
      if to_char(due,'YYYY-MM-DD') <> p_due_on then raise exception 'Invalid due day' using errcode = '22023'; end if;
    end if;
  end if;
  if p_operation = 'create' then
    if p_revision <> 0 then raise exception 'Invalid revision' using errcode = '22023'; end if;
    if entry.id is not null then
      if entry.removed_at is null and entry.revision = 0 and entry.title = title_value and entry.priority = p_priority and entry.due_on is not distinct from due then return; end if;
      raise exception 'Task already exists' using errcode = '40001';
    end if;
    insert into public.tasks(id,user_id,title,priority,due_on) values(p_id,owner_id,title_value,p_priority,due);
    return;
  end if;
  if entry.id is null then raise exception 'Task unavailable' using errcode = '42501'; end if;
  if entry.removed_at is not null then
    if p_operation = 'remove' then return; end if;
    raise exception 'Task unavailable' using errcode = '42501';
  end if;
  -- A repeat sets the same desired status; it never toggles blindly.
  if (p_operation = 'complete' and entry.completed_at is not null) or (p_operation = 'reopen' and entry.completed_at is null) then return; end if;
  if entry.revision <> p_revision then raise exception 'Stale task' using errcode = '40001'; end if;
  update public.tasks set
    title = case when p_operation = 'update' then title_value else title end,
    priority = case when p_operation = 'update' then p_priority else priority end,
    due_on = case when p_operation = 'update' then due else due_on end,
    completed_at = case when p_operation = 'complete' then now() when p_operation = 'reopen' then null else completed_at end,
    removed_at = case when p_operation = 'remove' then now() else removed_at end,
    revision = revision + 1
    where user_id = owner_id and id = p_id;
end; $$;
revoke all on function public.mutate_task(text,uuid,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.mutate_task(text,uuid,integer,text,text,text) to authenticated;

create function public.read_tasks(p_day text,p_view text default 'all',p_status text default 'open',p_page integer default 0)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare day_value date; week_start date; result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_day is null or p_day !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])-[0-9]{2}$'
    or p_view is null or p_view not in ('all','day','week','undated')
    or p_status is null or p_status not in ('open','completed')
    or p_page is null or p_page not between 0 and 1000000
    then raise exception 'Invalid request' using errcode = '22023'; end if;
  day_value := p_day::date;
  if to_char(day_value,'YYYY-MM-DD') <> p_day then raise exception 'Invalid day' using errcode = '22023'; end if;
  if not exists (select 1 from public.onboarding where user_id = auth.uid() and completed_at is not null)
    then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  week_start := day_value - (extract(isodow from day_value)::integer - 1);
  with entries as (
    select id,title,priority,due_on,revision,completed_at,
      case priority when 'high' then 0 when 'normal' then 1 else 2 end as rank
    from public.tasks where user_id = auth.uid() and removed_at is null
      and ((p_status = 'open' and completed_at is null) or (p_status = 'completed' and completed_at is not null))
      and (p_view = 'all' or (p_view = 'undated' and due_on is null)
        or (p_view = 'day' and due_on = day_value)
        or (p_view = 'week' and due_on between week_start and week_start + 6))
  ), page as (select * from entries order by due_on nulls last,rank,id limit 25 offset p_page * 25)
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(p) - 'rank' order by due_on nulls last,rank,id) from page p),'[]'::jsonb),
    'total',(select count(*) from entries)
  ) into result;
  return result;
end; $$;
revoke all on function public.read_tasks(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.read_tasks(text,text,text,integer) to authenticated;
