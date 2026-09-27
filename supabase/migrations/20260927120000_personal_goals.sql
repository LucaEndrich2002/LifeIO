-- Both goal kinds share ownership, deadlines and milestones. Money is absent on personal goals.
alter table public.goals add column kind text not null default 'financial' check (kind in ('financial','personal'));
alter table public.goals alter column target_minor drop not null;
alter table public.goals alter column current_minor drop not null;
alter table public.goals alter column monthly_minor drop not null;
alter table public.goals alter column currency drop not null;
alter table public.goals add constraint goals_kind_fields check (
  (kind = 'financial' and target_minor is not null and current_minor is not null and monthly_minor is not null and currency is not null)
  or (kind = 'personal' and target_minor is null and current_minor is null and monthly_minor is null and currency is null and onboarding_slot is null)
);
create index goals_owner_kind_created on public.goals(user_id,kind,created_at desc,id);

create function public.mutate_personal_goal(p_operation text, p_id uuid, p_revision integer, p_name text, p_deadline text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); g public.goals%rowtype; goal_name text; due date;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_operation is null or p_operation not in ('create','update') or p_id is null
    or p_revision is null or p_revision not between 0 and 2147483646
    then raise exception 'Invalid request' using errcode = '22023'; end if;
  goal_name := btrim(p_name, U&'\0009\000a\000b\000c\000d\0020\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff');
  if goal_name is null or char_length(goal_name) not between 1 and 80 then raise exception 'Invalid name' using errcode = '22023'; end if;
  if p_deadline is null then raise exception 'Invalid deadline' using errcode = '22023'; end if;
  if p_deadline <> '' then
    if p_deadline !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])-[0-9]{2}$' then raise exception 'Invalid deadline' using errcode = '22023'; end if;
    due := p_deadline::date;
    if to_char(due,'YYYY-MM-DD') <> p_deadline then raise exception 'Invalid deadline' using errcode = '22023'; end if;
  end if;
  perform 1 from public.profiles where user_id = owner_id for share;
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  select * into g from public.goals where user_id = owner_id and id = p_id for update;
  if g.id is not null and g.kind <> 'personal' then raise exception 'Goal unavailable' using errcode = '42501'; end if;
  if p_operation = 'create' then
    if p_revision <> 0 then raise exception 'Invalid revision' using errcode = '22023'; end if;
    if g.id is not null then
      if g.revision = 0 and g.name = goal_name and g.deadline is not distinct from due then return; end if;
      raise exception 'Goal already exists' using errcode = '40001';
    end if;
    insert into public.goals(id,user_id,kind,onboarding_slot,name,deadline,target_minor,current_minor,monthly_minor,currency)
      values(p_id,owner_id,'personal',null,goal_name,due,null,null,null,null);
    return;
  end if;
  if g.id is null then raise exception 'Goal unavailable' using errcode = '42501'; end if;
  if g.revision <> p_revision then raise exception 'Stale goal' using errcode = '40001'; end if;
  update public.goals set name = goal_name,deadline = due,revision = revision + 1 where user_id = owner_id and id = p_id;
end; $$;
revoke all on function public.mutate_personal_goal(text,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.mutate_personal_goal(text,uuid,integer,text,text) to authenticated;

create or replace function public.initialize_goal_rates() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.completed_at is null and new.completed_at is not null then
    insert into public.goal_rates(user_id,goal_id,month,amount_minor)
      select user_id,id,new.month,monthly_minor from public.goals where user_id = new.user_id and kind = 'financial';
  end if;
  return new;
end; $$;
revoke all on function public.initialize_goal_rates() from public,anon,authenticated;

-- Preserve savings behavior while keeping personal goals outside financial operations.
create or replace function public.mutate_goal(p_operation text, p_id uuid, p_entry_id uuid, p_revision integer, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  g public.goals%rowtype;
  contribution public.goal_contributions%rowtype;
  latest public.goal_rates%rowtype;
  entry_name text; entry_note text; target bigint; opening bigint; monthly bigint; amount bigint;
  effective date; due date; paid date; today date; total numeric;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_operation is null or p_operation not in ('create','update','contribute','cancel') or p_id is null or p_entry_id is null
    or p_revision is null or p_revision not between 0 and 2147483646 or jsonb_typeof(p_payload) is distinct from 'object'
    then raise exception 'Invalid request' using errcode = '22023'; end if;
  -- Same lock order as onboarding: profile, then completed setup, then goal.
  select (now() at time zone time_zone)::date into today from public.profiles where user_id = owner_id for share;
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  select * into g from public.goals where id = p_id and user_id = owner_id for update;
  if g.id is not null and g.kind <> 'financial' then raise exception 'Goal unavailable' using errcode = '42501'; end if;
  if p_operation <> 'create' and not found then raise exception 'Goal unavailable' using errcode = '42501'; end if;
  if p_operation in ('create','update') then
    if jsonb_typeof(p_payload->'name') is distinct from 'string' then raise exception 'Invalid name' using errcode = '22023'; end if;
    entry_name := btrim(p_payload->>'name');
    if char_length(entry_name) not between 1 and 80 then raise exception 'Invalid name' using errcode = '22023'; end if;
    target := public.onboarding_amount(p_payload->'target');
    opening := public.onboarding_amount(p_payload->'opening', true);
    monthly := public.onboarding_amount(p_payload->'monthly', true);
    if (p_payload->>'month') is null or (p_payload->>'month') !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$' then raise exception 'Invalid month' using errcode = '22023'; end if;
    effective := ((p_payload->>'month') || '-01')::date;
    if coalesce(p_payload->>'deadline','') <> '' then
      if (p_payload->>'deadline') !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])-[0-9]{2}$' then raise exception 'Invalid deadline' using errcode = '22023'; end if;
      due := (p_payload->>'deadline')::date;
    end if;
    select * into latest from public.goal_rates where user_id = owner_id and goal_id = p_id order by month desc limit 1;
    if p_operation = 'create' then
      if p_revision <> 0 then raise exception 'Invalid revision' using errcode = '22023'; end if;
      if g.id is not null then
        if g.revision = 0 and g.name = entry_name and g.target_minor = target and g.current_minor = opening
          and g.monthly_minor = monthly and g.deadline is not distinct from due and latest.month = effective then return; end if;
        raise exception 'Goal already exists' using errcode = '40001';
      end if;
      insert into public.goals(id,user_id,onboarding_slot,name,target_minor,current_minor,monthly_minor,deadline)
        values(p_id,owner_id,null,entry_name,target,opening,monthly,due);
      insert into public.goal_rates(user_id,goal_id,month,amount_minor) values(owner_id,p_id,effective,monthly);
      return;
    end if;
    if g.revision <> p_revision then raise exception 'Stale goal' using errcode = '40001'; end if;
    select opening + coalesce(sum(amount_minor),0) into total from public.goal_contributions where user_id = owner_id and goal_id = p_id and cancelled_at is null;
    if total > 99999999999 then raise exception 'Balance exceeds supported range' using errcode = '22003'; end if;
    if latest.month is null then raise exception 'Missing savings plan' using errcode = '22023'; end if;
    if latest.amount_minor <> monthly or latest.month <> effective then
      if effective <= latest.month then raise exception 'Rate must begin later' using errcode = '22023'; end if;
      insert into public.goal_rates(user_id,goal_id,month,amount_minor) values(owner_id,p_id,effective,monthly);
    end if;
    update public.goals set name = entry_name,target_minor = target,current_minor = opening,monthly_minor = monthly,deadline = due,revision = revision + 1 where user_id = owner_id and id = p_id;
    return;
  end if;
  select * into contribution from public.goal_contributions where user_id = owner_id and goal_id = p_id and id = p_entry_id for update;
  if p_operation = 'cancel' then
    if not found then raise exception 'Contribution unavailable' using errcode = '42501'; end if;
    if contribution.cancelled_at is not null then return; end if;
    if g.revision <> p_revision then raise exception 'Stale goal' using errcode = '40001'; end if;
    update public.goal_contributions set cancelled_at = now() where user_id = owner_id and goal_id = p_id and id = p_entry_id;
  else
    amount := public.onboarding_amount(p_payload->'amount');
    if (p_payload->>'date') is null or (p_payload->>'date') !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])-[0-9]{2}$' then raise exception 'Invalid date' using errcode = '22023'; end if;
    paid := (p_payload->>'date')::date;
    if paid > today then raise exception 'Future contribution' using errcode = '22023'; end if;
    if jsonb_typeof(p_payload->'note') is distinct from 'string' then raise exception 'Invalid note' using errcode = '22023'; end if;
    entry_note := btrim(p_payload->>'note');
    if char_length(entry_note) > 80 then raise exception 'Invalid note' using errcode = '22023'; end if;
    if contribution.id is not null then
      if contribution.cancelled_at is null and contribution.amount_minor = amount and contribution.paid_on = paid and contribution.note = entry_note then return; end if;
      raise exception 'Contribution already exists' using errcode = '40001';
    end if;
    if g.revision <> p_revision then raise exception 'Stale goal' using errcode = '40001'; end if;
    select g.current_minor + amount + coalesce(sum(amount_minor),0) into total from public.goal_contributions where user_id = owner_id and goal_id = p_id and cancelled_at is null;
    if total > 99999999999 then raise exception 'Balance exceeds supported range' using errcode = '22003'; end if;
    insert into public.goal_contributions(id,user_id,goal_id,amount_minor,paid_on,note) values(p_entry_id,owner_id,p_id,amount,paid,entry_note);
  end if;
  update public.goals set revision = revision + 1 where user_id = owner_id and id = p_id;
end; $$;
revoke all on function public.mutate_goal(text,uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.mutate_goal(text,uuid,uuid,integer,jsonb) to authenticated;

create or replace function public.read_goal(p_id uuid, p_page integer default 0) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_id is null or p_page is null or p_page not between 0 and 1000000 then raise exception 'Invalid request' using errcode = '22023'; end if;
  with entries as (select * from public.goal_contributions where user_id = auth.uid() and goal_id = p_id),
  page as (select id,amount_minor,paid_on,note,cancelled_at from entries order by paid_on desc,created_at desc,id limit 25 offset p_page * 25)
  select jsonb_build_object('goal',to_jsonb(g),
    'balance',(g.current_minor + (select coalesce(sum(amount_minor),0) from entries where cancelled_at is null))::text,
    'rates',coalesce((select jsonb_agg(jsonb_build_object('month',month,'amount_minor',amount_minor) order by month desc) from public.goal_rates where user_id = auth.uid() and goal_id = p_id),'[]'::jsonb),
    'entries',coalesce((select jsonb_agg(to_jsonb(p)) from page p),'[]'::jsonb),
    'count',(select count(*) from entries)) into result from public.goals g where g.user_id = auth.uid() and g.id = p_id and g.kind = 'financial';
  return result;
end; $$;
revoke all on function public.read_goal(uuid,integer) from public,anon,authenticated;
grant execute on function public.read_goal(uuid,integer) to authenticated;

create or replace function public.read_money_month(p_month text, p_income_page integer default 0, p_expense_page integer default 0)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb; first_day date; after_month date;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_month is null or p_month !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$'
    or p_income_page is null or p_income_page not between 0 and 1000000
    or p_expense_page is null or p_expense_page not between 0 and 1000000 then raise exception 'Invalid month or page' using errcode = '22023'; end if;
  first_day := (p_month || '-01')::date;
  after_month := (first_day + interval '1 month')::date;
  with savings_rows as (select g.id,g.name,r.amount_minor from public.goals g cross join lateral (select amount_minor from public.goal_rates where goal_id = g.id and user_id = auth.uid() and month <= first_day order by month desc limit 1) r where g.user_id = auth.uid() and g.kind = 'financial'),
  income_rows as (select * from public.incomes where user_id = auth.uid() and month = first_day),
  expense_rows as (select * from public.expenses where user_id = auth.uid() and recurrence = 'once' and spent_on >= first_day and spent_on < after_month),
  fixed_rows as (select * from public.expenses where user_id = auth.uid() and recurrence = 'monthly' and start_month <= first_day and (end_month is null or end_month >= first_day)),
  income_page as (select id, name, amount_minor, month, revision from income_rows order by created_at desc, id limit 25 offset p_income_page * 25),
  expense_page as (select id, name, amount_minor, spent_on, category, revision from expense_rows order by spent_on desc, created_at desc, id limit 25 offset p_expense_page * 25)
  select jsonb_build_object(
    'incomes', coalesce((select jsonb_agg(to_jsonb(r)) from income_page r), '[]'::jsonb),
    'expenses', coalesce((select jsonb_agg(to_jsonb(r)) from expense_page r), '[]'::jsonb),
    'fixed', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'amount_minor', amount_minor, 'start_month', start_month, 'end_month', end_month, 'superseded_by', superseded_by) order by onboarding_slot, id) from fixed_rows), '[]'::jsonb),
    'budget', (select jsonb_build_object('id', id, 'name', name, 'amount_minor', amount_minor, 'revision', revision, 'month', month) from public.budgets where user_id = auth.uid() and month = first_day),
    'fixed_known', (exists (select 1 from public.expenses where user_id = auth.uid() and recurrence = 'monthly' and start_month <= first_day) or exists (select 1 from public.onboarding where user_id = auth.uid() and expenses_status = 'saved' and month <= first_day)),
    'savings_plans',coalesce((select jsonb_agg(to_jsonb(r) order by name,id) from savings_rows r),'[]'::jsonb),
    'goal_count',(select count(*) from public.goals where user_id = auth.uid() and kind = 'financial'),
    'totals', jsonb_build_object(
      'income', (select coalesce(sum(amount_minor), 0)::text from income_rows),
      'variable', (select coalesce(sum(amount_minor), 0)::text from expense_rows),
      'fixed', (select coalesce(sum(amount_minor), 0)::text from fixed_rows),
      'savings', (select coalesce(sum(amount_minor),0)::text from savings_rows),
      'income_count', (select count(*) from income_rows), 'expense_count', (select count(*) from expense_rows)
    )) into result;
  return result;
end; $$;
revoke all on function public.read_money_month(text, integer, integer) from public, anon, authenticated;
grant execute on function public.read_money_month(text, integer, integer) to authenticated;
