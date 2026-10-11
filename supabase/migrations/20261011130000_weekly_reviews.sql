begin;

create table public.weekly_reviews (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1 and week_start between date '2000-01-03' and date '2100-12-13'),
  time_zone text not null check (public.is_supported_time_zone(time_zone)),
  rule_version integer not null default 1 check (rule_version = 1),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);
alter table public.weekly_reviews enable row level security;
revoke all on public.weekly_reviews from public, anon, authenticated;
grant select on public.weekly_reviews to authenticated;
create policy weekly_reviews_select_own on public.weekly_reviews for select to authenticated
  using (user_id = (select auth.uid()));

-- No caller-supplied owner, zone, clock, metrics or insight text. Opening a review
-- only reads the table. Explicit creation (-1) is idempotent; refresh uses revision.
create function public.generate_weekly_review(p_week text, p_revision integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  week_value date;
  zone_value text;
  stored public.weekly_reviews%rowtype;
  week_from timestamptz;
  week_until timestamptz;
  next_until timestamptz;
  result jsonb;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_week is null or p_week !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])-[0-9]{2}$'
    or p_revision is null or p_revision not between -1 and 2147483646 then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  week_value := p_week::date;
  if to_char(week_value,'YYYY-MM-DD') <> p_week or extract(isodow from week_value) <> 1
    or week_value not between date '2000-01-03' and date '2100-12-13' then
    raise exception 'Invalid week' using errcode = '22023';
  end if;
  select time_zone into zone_value from public.profiles where user_id = owner_id for share;
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  select * into stored from public.weekly_reviews where user_id = owner_id and week_start = week_value for update;
  if found then
    if p_revision = -1 then return; end if;
    if p_revision <> stored.revision then raise exception 'Stale review' using errcode = '40001'; end if;
    -- Preserve the original interpretation even if the profile zone later changes.
    zone_value := stored.time_zone;
  elsif p_revision <> -1 then
    raise exception 'Review unavailable' using errcode = '40001';
  end if;
  if week_value + 7 > (now() at time zone zone_value)::date then
    raise exception 'Week not completed' using errcode = '22023';
  end if;
  week_from := week_value::timestamp at time zone zone_value;
  week_until := (week_value + 7)::timestamp at time zone zone_value;
  next_until := (week_value + 14)::timestamp at time zone zone_value;

  -- One statement snapshot, complete aggregates and bounded detail lists.
  with weekly_expenses as (
    select amount_minor, spent_on from public.expenses where user_id = owner_id and recurrence = 'once'
      and spent_on >= week_value - 7 and spent_on < week_value + 7
  ), months as (
    select to_char(day,'YYYY-MM') as month, public.read_money_month(to_char(day,'YYYY-MM'),0,0) as data
      from generate_series(date_trunc('month',week_value::timestamp),date_trunc('month',(week_value + 6)::timestamp),interval '1 month') day
  ), goals as (
    select public.read_home_goals(to_char(week_value + 6,'YYYY-MM-DD'),0) as data
  ), contributions as (
    select amount_minor from public.goal_contributions where user_id = owner_id and cancelled_at is null
      and paid_on >= week_value and paid_on < week_value + 7
  ), open_tasks as (
    select id,title,priority,due_on from public.tasks where user_id = owner_id and removed_at is null and completed_at is null
  ), task_page as (
    select * from open_tasks order by due_on nulls last,case priority when 'high' then 0 when 'normal' then 1 else 2 end,id limit 3
  ), next_events as (
    select id,title,starts_at,ends_at from public.calendar_events where user_id = owner_id and removed_at is null
      and starts_at < next_until and ends_at > week_until
  ), event_page as (select * from next_events order by starts_at,id limit 3),
  next_goals as (
    select g.id,g.name,g.deadline from public.goals g where g.user_id = owner_id
      and g.deadline >= week_value + 7 and g.deadline < week_value + 14
      and case when g.kind = 'financial' then g.current_minor + coalesce((select sum(c.amount_minor) from public.goal_contributions c where c.user_id = owner_id and c.goal_id = g.id and c.cancelled_at is null),0) < g.target_minor
        else not exists (select 1 from public.goal_milestones m where m.user_id = owner_id and m.goal_id = g.id and m.removed_at is null)
          or exists (select 1 from public.goal_milestones m where m.user_id = owner_id and m.goal_id = g.id and m.removed_at is null and m.completed_at is null) end
  ), deadline_page as (select * from next_goals order by deadline,id limit 3)
  select jsonb_build_object(
    'version',1,'currency','EUR','week_start',week_value,'week_end',week_value + 6,'time_zone',zone_value,
    'range_start',week_from,'range_end',week_until,
    'expenses',jsonb_build_object(
      'current_minor',(select coalesce(sum(amount_minor),0)::text from weekly_expenses where spent_on >= week_value),
      'current_count',(select count(*) from weekly_expenses where spent_on >= week_value),
      'previous_minor',(select coalesce(sum(amount_minor),0)::text from weekly_expenses where spent_on < week_value),
      'previous_count',(select count(*) from weekly_expenses where spent_on < week_value)),
    'months',coalesce((select jsonb_agg(jsonb_build_object('month',month,'totals',data->'totals','fixed_known',data->'fixed_known','budget',data->'budget') order by month) from months),'[]'::jsonb),
    'goals',jsonb_build_object(
      'total',(select (data->>'total')::bigint from goals),
      'items',(select coalesce(jsonb_agg(item - 'rates' order by ordinal),'[]'::jsonb) from goals,jsonb_array_elements(data->'items') with ordinality as entries(item,ordinal)),
      'contributions_minor',(select coalesce(sum(amount_minor),0)::text from contributions),
      'contribution_count',(select count(*) from contributions),
      'milestones_completed',(select count(*) from public.goal_milestones where user_id = owner_id and removed_at is null and completed_at >= week_from and completed_at < week_until),
      'next_count',(select count(*) from next_goals),
      'next_items',coalesce((select jsonb_agg(to_jsonb(p) order by deadline,id) from deadline_page p),'[]'::jsonb)),
    'tasks',jsonb_build_object(
      'open',(select count(*) from open_tasks),
      'undated',(select count(*) from open_tasks where due_on is null),
      'due_by_end',(select count(*) from open_tasks where due_on < week_value + 7),
      'next_due',(select count(*) from open_tasks where due_on >= week_value + 7 and due_on < week_value + 14),
      'completed',(select count(*) from public.tasks where user_id = owner_id and removed_at is null and completed_at >= week_from and completed_at < week_until),
      'items',coalesce((select jsonb_agg(to_jsonb(p) order by due_on nulls last,case priority when 'high' then 0 when 'normal' then 1 else 2 end,id) from task_page p),'[]'::jsonb)),
    'events',jsonb_build_object('next_count',(select count(*) from next_events),
      'items',coalesce((select jsonb_agg(to_jsonb(p) order by starts_at,id) from event_page p),'[]'::jsonb))
  ) into result;

  -- Reject unsafe aggregate transport before persisting an unreadable snapshot.
  if exists (
    select 1 from (
      select (result->'expenses'->>'current_minor')::numeric as amount
      union all select (result->'expenses'->>'previous_minor')::numeric
      union all select (result->'goals'->>'contributions_minor')::numeric
      union all select (item->>'balance')::numeric from jsonb_array_elements(result->'goals'->'items') item
      union all select totals.value::numeric from jsonb_array_elements(result->'months') m,
        jsonb_each_text(m->'totals') as totals(key,value)
    ) totals where amount > 9007199254740991
  ) then raise exception 'Review aggregate exceeds supported range' using errcode = '22003'; end if;

  if stored.user_id is null then
    insert into public.weekly_reviews(user_id,week_start,time_zone,snapshot) values(owner_id,week_value,zone_value,result);
  else
    update public.weekly_reviews set snapshot = result,revision = revision + 1,updated_at = now()
      where user_id = owner_id and week_start = week_value;
  end if;
end; $$;
revoke all on function public.generate_weekly_review(text,integer) from public,anon,authenticated;
grant execute on function public.generate_weekly_review(text,integer) to authenticated;
commit;
