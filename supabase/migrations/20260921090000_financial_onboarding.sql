-- Normalized financial records, shared with later Money/Goals increments.
-- The onboarding slot identifies the initial entry, not a second financial ledger.
create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  onboarding_slot smallint not null default 0 check (onboarding_slot = 0),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  amount_minor bigint not null check (amount_minor between 1 and 99999999999),
  currency text not null default 'EUR' check (currency = 'EUR'),
  month date not null check (extract(day from month) = 1 and month between date '2000-01-01' and date '2100-12-01'),
  created_at timestamptz not null default now(),
  unique (user_id, onboarding_slot)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  onboarding_slot smallint not null check (onboarding_slot between 0 and 19),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  amount_minor bigint not null check (amount_minor between 1 and 99999999999),
  currency text not null default 'EUR' check (currency = 'EUR'),
  recurrence text not null default 'monthly' check (recurrence = 'monthly'),
  start_month date not null check (extract(day from start_month) = 1 and start_month between date '2000-01-01' and date '2100-12-01'),
  created_at timestamptz not null default now(),
  unique (user_id, onboarding_slot)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  onboarding_slot smallint not null default 0 check (onboarding_slot = 0),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  target_minor bigint not null check (target_minor between 1 and 99999999999),
  current_minor bigint not null check (current_minor between 0 and 99999999999),
  monthly_minor bigint not null check (monthly_minor between 0 and 99999999999),
  currency text not null default 'EUR' check (currency = 'EUR'),
  created_at timestamptz not null default now(),
  unique (user_id, onboarding_slot)
);

create table public.onboarding (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  month date not null check (extract(day from month) = 1 and month between date '2000-01-01' and date '2100-12-01'),
  income_status text not null default 'pending' check (income_status in ('pending', 'saved', 'skipped')),
  expenses_status text not null default 'pending' check (expenses_status in ('pending', 'saved', 'skipped')),
  goal_status text not null default 'pending' check (goal_status in ('pending', 'saved', 'skipped')),
  revision integer not null default 0 check (revision >= 0),
  completed_at timestamptz,
  check (completed_at is null or (income_status <> 'pending' and expenses_status <> 'pending' and goal_status <> 'pending'))
);

alter table public.incomes enable row level security;
alter table public.expenses enable row level security;
alter table public.goals enable row level security;
alter table public.onboarding enable row level security;
revoke all on table public.incomes, public.expenses, public.goals, public.onboarding from public, anon, authenticated;
grant select on table public.incomes, public.expenses, public.goals, public.onboarding to authenticated;
create policy incomes_select_own on public.incomes for select to authenticated using ((select auth.uid()) = user_id);
create policy expenses_select_own on public.expenses for select to authenticated using ((select auth.uid()) = user_id);
create policy goals_select_own on public.goals for select to authenticated using ((select auth.uid()) = user_id);
create policy onboarding_select_own on public.onboarding for select to authenticated using ((select auth.uid()) = user_id);

-- Internal validators are not exposed as callable Data API operations.
create function public.onboarding_amount(value jsonb, allow_zero boolean default false)
returns bigint language plpgsql immutable security invoker set search_path = '' as $$
declare result bigint;
begin
  if jsonb_typeof(value) is distinct from 'number' or (value #>> '{}') !~ '^[0-9]{1,11}$' then
    raise exception 'Invalid amount' using errcode = '22023';
  end if;
  result := (value #>> '{}')::bigint;
  if result < (case when allow_zero then 0 else 1 end) or result > 99999999999 then
    raise exception 'Invalid amount' using errcode = '22023';
  end if;
  return result;
end; $$;
revoke all on function public.onboarding_amount(jsonb, boolean) from public, anon, authenticated;

-- Only this narrow transactional operation can write the four tables.
-- It never accepts an owner or row ID: EVERY write is scoped to auth.uid().
-- The elevated database function is needed to prevent callers from forging completion.
create function public.save_onboarding_step(p_step text, p_payload jsonb, p_revision integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  profile_zone text;
  state public.onboarding%rowtype;
  choice text := p_payload->>'decision';
  selected_month date;
  item jsonb;
  item_slot integer := 0;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_step is null or p_step not in ('income', 'expenses', 'goal', 'complete')
    or jsonb_typeof(p_payload) is distinct from 'object'
    or p_revision is null or p_revision < 0 then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  select time_zone into profile_zone from public.profiles where user_id = owner_id for share;
  if not found then raise exception 'Profile required' using errcode = '22023'; end if;
  insert into public.onboarding (user_id, month)
    values (owner_id, date_trunc('month', now() at time zone profile_zone)::date)
    on conflict (user_id) do nothing;
  select * into strict state from public.onboarding where user_id = owner_id for update;
  if state.completed_at is not null then
    if p_step = 'complete' then return; end if;
    raise exception 'Onboarding already completed' using errcode = '22023';
  end if;
  if state.revision <> p_revision then raise exception 'Stale onboarding revision' using errcode = '40001'; end if;
  if p_step = 'complete' then
    if state.income_status = 'pending' or state.expenses_status = 'pending' or state.goal_status = 'pending' then
      raise exception 'Onboarding incomplete' using errcode = '22023';
    end if;
    update public.onboarding set completed_at = now(), revision = revision + 1 where user_id = owner_id;
    return;
  end if;
  if choice is null or choice not in ('saved', 'skipped') then raise exception 'Decision required' using errcode = '22023'; end if;
  if p_step = 'income' then
    if (p_payload->>'month') is null or (p_payload->>'month') !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$' then
      raise exception 'Invalid month' using errcode = '22023';
    end if;
    selected_month := ((p_payload->>'month') || '-01')::date;
    if choice = 'saved' then
      if jsonb_typeof(p_payload->'name') is distinct from 'string' then raise exception 'Invalid name' using errcode = '22023'; end if;
      insert into public.incomes (user_id, name, amount_minor, month)
        values (owner_id, btrim(p_payload->>'name'), public.onboarding_amount(p_payload->'amount'), selected_month)
        on conflict (user_id, onboarding_slot) do update set name = excluded.name, amount_minor = excluded.amount_minor, month = excluded.month;
    else
      delete from public.incomes where user_id = owner_id and onboarding_slot = 0;
    end if;
    -- Draft month changes apply to all initial monthly positions together.
    update public.expenses set start_month = selected_month where user_id = owner_id;
    update public.onboarding set month = selected_month, income_status = choice where user_id = owner_id;
  elsif p_step = 'expenses' then
    if state.income_status = 'pending' then raise exception 'Income decision required' using errcode = '22023'; end if;
    if choice = 'saved' then
      if jsonb_typeof(p_payload->'items') is distinct from 'array' then raise exception 'Invalid expenses' using errcode = '22023'; end if;
      if jsonb_array_length(p_payload->'items') not between 1 and 20 then raise exception 'Invalid expense count' using errcode = '22023'; end if;
      for item in select value from jsonb_array_elements(p_payload->'items') loop
        if jsonb_typeof(item->'name') is distinct from 'string' then raise exception 'Invalid name' using errcode = '22023'; end if;
        insert into public.expenses (user_id, onboarding_slot, name, amount_minor, start_month)
          values (owner_id, item_slot, btrim(item->>'name'), public.onboarding_amount(item->'amount'), state.month)
          on conflict (user_id, onboarding_slot) do update set name = excluded.name, amount_minor = excluded.amount_minor;
        item_slot := item_slot + 1;
      end loop;
    end if;
    delete from public.expenses where user_id = owner_id and onboarding_slot >= item_slot;
    update public.onboarding set expenses_status = choice where user_id = owner_id;
  elsif p_step = 'goal' then
    if state.expenses_status = 'pending' then raise exception 'Expenses decision required' using errcode = '22023'; end if;
    if choice = 'saved' then
      if jsonb_typeof(p_payload->'name') is distinct from 'string' then raise exception 'Invalid name' using errcode = '22023'; end if;
      insert into public.goals (user_id, name, target_minor, current_minor, monthly_minor)
        values (owner_id, btrim(p_payload->>'name'), public.onboarding_amount(p_payload->'target'), public.onboarding_amount(p_payload->'current', true), public.onboarding_amount(p_payload->'monthly', true))
        on conflict (user_id, onboarding_slot) do update set name = excluded.name, target_minor = excluded.target_minor, current_minor = excluded.current_minor, monthly_minor = excluded.monthly_minor;
    else
      delete from public.goals where user_id = owner_id and onboarding_slot = 0;
    end if;
    update public.onboarding set goal_status = choice where user_id = owner_id;
  end if;
  update public.onboarding set revision = revision + 1 where user_id = owner_id;
end; $$;
revoke all on function public.save_onboarding_step(text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.save_onboarding_step(text, jsonb, integer) to authenticated;
