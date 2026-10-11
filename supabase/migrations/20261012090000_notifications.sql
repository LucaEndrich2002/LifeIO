begin;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  kind text not null check (kind in ('budget','task','goal','review')),
  task_id uuid,
  goal_id uuid,
  budget_id uuid,
  review_week date,
  context jsonb not null check (jsonb_typeof(context) = 'object'),
  rule_version integer not null default 1 check (rule_version = 1),
  time_zone text not null check (public.is_supported_time_zone(time_zone)),
  checked_on date not null check (checked_on between date '2000-01-01' and date '2100-12-31'),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  revision integer not null default 0 check (revision >= 0),
  foreign key (user_id,task_id) references public.tasks(user_id,id) on delete cascade,
  foreign key (user_id,goal_id) references public.goals(user_id,id) on delete cascade,
  foreign key (user_id,budget_id) references public.budgets(user_id,id) on delete cascade,
  foreign key (user_id,review_week) references public.weekly_reviews(user_id,week_start) on delete cascade,
  check (
    (kind = 'task' and task_id is not null and goal_id is null and budget_id is null and review_week is null)
    or (kind = 'goal' and goal_id is not null and task_id is null and budget_id is null and review_week is null)
    or (kind = 'budget' and budget_id is not null and task_id is null and goal_id is null and review_week is null)
    or (kind = 'review' and review_week is not null and task_id is null and goal_id is null and budget_id is null)
  )
);
create unique index notifications_task_once on public.notifications(user_id,task_id) where kind = 'task';
create unique index notifications_goal_once on public.notifications(user_id,goal_id) where kind = 'goal';
create unique index notifications_budget_once on public.notifications(user_id,budget_id) where kind = 'budget';
create unique index notifications_review_once on public.notifications(user_id,review_week) where kind = 'review';
create index notifications_owner_page on public.notifications(user_id,created_at desc,id desc);
create index notifications_owner_unread on public.notifications(user_id,created_at desc,id desc) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from public,anon,authenticated;
grant select on public.notifications to authenticated;
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

-- Removed sources must not leave links or copied titles in the inbox.
create function public.remove_task_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications where user_id = new.user_id and task_id = new.id;
  return new;
end; $$;
revoke all on function public.remove_task_notifications() from public,anon,authenticated;
create trigger tasks_remove_notifications after update of removed_at on public.tasks
  for each row when (old.removed_at is null and new.removed_at is not null)
  execute function public.remove_task_notifications();

-- Explicit in-app evaluation only; callers cannot supply an owner, clock,
-- destination or notification text. Re-evaluation preserves read state/context.
create function public.synchronize_notifications()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  zone_value text;
  day_value date;
  month_value text;
  money jsonb;
  inserted integer;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select time_zone into zone_value from public.profiles where user_id = owner_id for share;
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  day_value := (now() at time zone zone_value)::date;
  if day_value not between date '2000-01-01' and date '2100-12-31' then
    raise exception 'Unsupported day' using errcode = '22023';
  end if;
  month_value := to_char(day_value,'YYYY-MM');
  -- All ordinary source mutations share the onboarding lock, preserving a
  -- consistent basis for this evaluation even across the reused Money function.
  money := public.read_money_month(month_value,0,0);
  if (money->'totals'->>'variable')::numeric > 9007199254740991 then
    raise exception 'Unsupported total' using errcode = '22003';
  end if;
  with candidates as (
    select 'task'::text as kind,t.id as task_id,null::uuid as goal_id,null::uuid as budget_id,null::date as review_week,
      jsonb_build_object('name',t.title,'due_on',t.due_on) as context
    from public.tasks t where t.user_id = owner_id and t.removed_at is null and t.completed_at is null and t.due_on < day_value
    union all
    select 'goal',null,g.id,null,null,jsonb_build_object('name',g.name,'due_on',g.deadline)
    from public.goals g where g.user_id = owner_id and g.deadline < day_value
      and case when g.kind = 'financial' then g.current_minor + coalesce((select sum(c.amount_minor) from public.goal_contributions c where c.user_id = owner_id and c.goal_id = g.id and c.cancelled_at is null),0) < g.target_minor
        else not exists (select 1 from public.goal_milestones m where m.user_id = owner_id and m.goal_id = g.id and m.removed_at is null)
          or exists (select 1 from public.goal_milestones m where m.user_id = owner_id and m.goal_id = g.id and m.removed_at is null and m.completed_at is null) end
    union all
    select 'budget',null,null,(money->'budget'->>'id')::uuid,null,
      jsonb_build_object('name',money->'budget'->>'name','month',month_value,'currency','EUR',
        'spent_minor',money->'totals'->>'variable','limit_minor',money->'budget'->>'amount_minor')
    where money->'budget'->>'id' is not null
      and (money->'totals'->>'variable')::numeric * 100 >= (money->'budget'->>'amount_minor')::numeric * 90
    union all
    select 'review',null,null,null,r.week_start,jsonb_build_object('week_start',r.week_start)
    from public.weekly_reviews r where r.user_id = owner_id
  )
  insert into public.notifications(user_id,kind,task_id,goal_id,budget_id,review_week,context,time_zone,checked_on)
    select owner_id,kind,task_id,goal_id,budget_id,review_week,context,zone_value,day_value from candidates
    on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end; $$;
revoke all on function public.synchronize_notifications() from public,anon,authenticated;
grant execute on function public.synchronize_notifications() to authenticated;

create function public.read_notifications(p_filter text default 'all',p_page integer default 0)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_filter is null or p_filter not in ('all','unread') or p_page is null or p_page not between 0 and 1000000 then
    raise exception 'Invalid query' using errcode = '22023';
  end if;
  if not exists (select 1 from public.onboarding where user_id = auth.uid() and completed_at is not null) then
    raise exception 'Complete onboarding first' using errcode = '42501';
  end if;
  return (
    with own as (select * from public.notifications where user_id = auth.uid()),
    matching as (select * from own where p_filter = 'all' or read_at is null),
    page as (select * from matching order by created_at desc,id desc limit 25 offset p_page * 25)
    select jsonb_build_object('total',(select count(*) from matching),'unread',(select count(*) from own where read_at is null),
      'items',coalesce((select jsonb_agg(to_jsonb(p) - 'user_id' order by created_at desc,id desc) from page p),'[]'::jsonb))
  );
end; $$;
revoke all on function public.read_notifications(text,integer) from public,anon,authenticated;
grant execute on function public.read_notifications(text,integer) to authenticated;

create function public.set_notification_read(p_id uuid,p_revision integer,p_read boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); entry public.notifications%rowtype;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_id is null or p_revision is null or p_revision not between 0 and 2147483646 or p_read is null then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  perform 1 from public.profiles where user_id = owner_id for share;
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  select * into entry from public.notifications where user_id = owner_id and id = p_id for update;
  if not found then raise exception 'Notification unavailable' using errcode = '42501'; end if;
  if (entry.read_at is not null) = p_read then return; end if;
  if entry.revision <> p_revision then raise exception 'Stale notification' using errcode = '40001'; end if;
  update public.notifications set read_at = case when p_read then now() else null end,revision = revision + 1
    where user_id = owner_id and id = p_id;
end; $$;
revoke all on function public.set_notification_read(uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.set_notification_read(uuid,integer,boolean) to authenticated;

commit;
