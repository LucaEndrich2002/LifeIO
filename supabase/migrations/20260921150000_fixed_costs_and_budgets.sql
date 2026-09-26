-- Fixed costs stay in the ledger. A change creates a successor, preserving older months.
alter table public.expenses add column end_month date;
alter table public.expenses add column superseded_by uuid unique;
alter table public.expenses add constraint expenses_owner_id unique (user_id, id);
alter table public.expenses add constraint expenses_successor_owner foreign key (user_id, superseded_by)
  references public.expenses(user_id, id) deferrable initially deferred;
alter table public.expenses add constraint expenses_period check (
  (recurrence = 'once' and end_month is null and superseded_by is null)
  or (recurrence = 'monthly' and (end_month is null or
    (end_month >= start_month and end_month <= date '2100-12-01' and extract(day from end_month) = 1))
    and (superseded_by is null or (superseded_by <> id and end_month is not null)))
);
create index expenses_fixed_period on public.expenses(user_id, start_month, end_month) where recurrence = 'monthly';

create table public.budgets (
  id uuid primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  amount_minor bigint not null check (amount_minor between 1 and 99999999999),
  currency text not null default 'EUR' check (currency = 'EUR'),
  month date not null check (month between date '2000-01-01' and date '2100-12-01' and extract(day from month) = 1),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, month)
);
alter table public.budgets enable row level security;
revoke all on public.budgets from public, anon, authenticated;
grant select on public.budgets to authenticated;
create policy budgets_select_own on public.budgets for select to authenticated using (user_id = (select auth.uid()));

create function public.mutate_fixed_cost(p_operation text, p_id uuid, p_new_id uuid, p_revision integer, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  old_row public.expenses%rowtype;
  new_row public.expenses%rowtype;
  entry_name text;
  entry_amount bigint;
  first_month date;
  last_month date;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_operation is null or p_operation not in ('create', 'change', 'end') or p_id is null or p_new_id is null
    or p_revision is null or p_revision not between 0 and 2147483646 or jsonb_typeof(p_payload) is distinct from 'object'
    then raise exception 'Invalid request' using errcode = '22023'; end if;
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  if (p_payload->>'month') is null or (p_payload->>'month') !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$'
    then raise exception 'Invalid month' using errcode = '22023'; end if;
  first_month := ((p_payload->>'month') || '-01')::date;
  if p_operation <> 'end' then
    if jsonb_typeof(p_payload->'name') is distinct from 'string' then raise exception 'Invalid name' using errcode = '22023'; end if;
    entry_name := btrim(p_payload->>'name');
    if char_length(entry_name) not between 1 and 80 then raise exception 'Invalid name' using errcode = '22023'; end if;
    entry_amount := public.onboarding_amount(p_payload->'amount');
    if coalesce(p_payload->>'end_month', '') <> '' then
      if (p_payload->>'end_month') !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$' then raise exception 'Invalid last month' using errcode = '22023'; end if;
      last_month := ((p_payload->>'end_month') || '-01')::date;
      if last_month < first_month then raise exception 'Invalid period' using errcode = '22023'; end if;
    end if;
  end if;
  select * into old_row from public.expenses where id = p_id and user_id = owner_id and recurrence = 'monthly' for update;
  if p_operation = 'create' then
    if p_revision <> 0 then raise exception 'Invalid revision' using errcode = '22023'; end if;
    if found then
      if old_row.revision = 0 and old_row.name = entry_name and old_row.amount_minor = entry_amount
        and old_row.start_month = first_month and old_row.end_month is not distinct from last_month then return; end if;
      raise exception 'Entry already exists' using errcode = '40001';
    end if;
    insert into public.expenses(id, user_id, onboarding_slot, name, amount_minor, recurrence, start_month, end_month)
      values (p_id, owner_id, null, entry_name, entry_amount, 'monthly', first_month, last_month);
    return;
  end if;
  if not found then raise exception 'Entry unavailable' using errcode = '42501'; end if;
  -- Retry of the same submitted change is a no-op, never a second recurring charge.
  if p_operation = 'change' and old_row.superseded_by = p_new_id and old_row.revision = p_revision + 1 then
    select * into new_row from public.expenses where id = p_new_id and user_id = owner_id and recurrence = 'monthly';
    if new_row.revision = 0 and new_row.name = entry_name and new_row.amount_minor = entry_amount
      and new_row.start_month = first_month and new_row.end_month is not distinct from last_month then return; end if;
  end if;
  if p_operation = 'end' and old_row.revision = p_revision + 1 and old_row.superseded_by is null and old_row.end_month = first_month then return; end if;
  if old_row.revision <> p_revision or old_row.superseded_by is not null then raise exception 'Stale entry' using errcode = '40001'; end if;
  if p_operation = 'end' then
    if first_month < old_row.start_month then raise exception 'Invalid last month' using errcode = '22023'; end if;
    update public.expenses set end_month = first_month, revision = revision + 1 where id = p_id and user_id = owner_id;
  else
    if p_new_id = p_id or first_month <= old_row.start_month or (old_row.end_month is not null and first_month > old_row.end_month)
      then raise exception 'Change outside current period' using errcode = '22023'; end if;
    insert into public.expenses(id, user_id, onboarding_slot, name, amount_minor, recurrence, start_month, end_month)
      values (p_new_id, owner_id, null, entry_name, entry_amount, 'monthly', first_month, last_month);
    update public.expenses set end_month = (first_month - interval '1 month')::date, superseded_by = p_new_id,
      revision = revision + 1 where id = p_id and user_id = owner_id;
  end if;
end; $$;
revoke all on function public.mutate_fixed_cost(text, uuid, uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.mutate_fixed_cost(text, uuid, uuid, integer, jsonb) to authenticated;

create function public.mutate_budget(p_operation text, p_id uuid, p_revision integer, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  old_row public.budgets%rowtype;
  entry_name text;
  entry_amount bigint;
  entry_month date;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_operation is null or p_operation not in ('create', 'update', 'delete') or p_id is null
    or p_revision is null or p_revision not between 0 and 2147483646 or jsonb_typeof(p_payload) is distinct from 'object'
    then raise exception 'Invalid request' using errcode = '22023'; end if;
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  if p_operation <> 'delete' then
    if jsonb_typeof(p_payload->'name') is distinct from 'string' then raise exception 'Invalid name' using errcode = '22023'; end if;
    entry_name := btrim(p_payload->>'name');
    if char_length(entry_name) not between 1 and 80 then raise exception 'Invalid name' using errcode = '22023'; end if;
    entry_amount := public.onboarding_amount(p_payload->'amount');
    if (p_payload->>'month') is null or (p_payload->>'month') !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$' then raise exception 'Invalid month' using errcode = '22023'; end if;
    entry_month := ((p_payload->>'month') || '-01')::date;
  end if;
  select * into old_row from public.budgets where id = p_id and user_id = owner_id for update;
  if p_operation = 'create' then
    if p_revision <> 0 then raise exception 'Invalid revision' using errcode = '22023'; end if;
    if found then
      if old_row.revision = 0 and old_row.name = entry_name and old_row.amount_minor = entry_amount and old_row.month = entry_month then return; end if;
      raise exception 'Budget already changed' using errcode = '40001';
    end if;
    if exists (select 1 from public.budgets where user_id = owner_id and month = entry_month) then raise exception 'Budget already exists for month' using errcode = '40001'; end if;
    insert into public.budgets(id, user_id, name, amount_minor, month) values(p_id, owner_id, entry_name, entry_amount, entry_month);
  else
    if not found then raise exception 'Budget unavailable' using errcode = '42501'; end if;
    if old_row.revision <> p_revision then raise exception 'Stale budget' using errcode = '40001'; end if;
    if p_operation = 'delete' then delete from public.budgets where id = p_id and user_id = owner_id;
    else
      if entry_month <> old_row.month then raise exception 'Budget month cannot change' using errcode = '22023'; end if;
      update public.budgets set name = entry_name, amount_minor = entry_amount, revision = revision + 1 where id = p_id and user_id = owner_id;
    end if;
  end if;
end; $$;
revoke all on function public.mutate_budget(text, uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.mutate_budget(text, uuid, integer, jsonb) to authenticated;

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
  with income_rows as (select * from public.incomes where user_id = auth.uid() and month = first_day),
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
    'totals', jsonb_build_object(
      'income', (select coalesce(sum(amount_minor), 0)::text from income_rows),
      'variable', (select coalesce(sum(amount_minor), 0)::text from expense_rows),
      'fixed', (select coalesce(sum(amount_minor), 0)::text from fixed_rows),
      'savings', (select coalesce(sum(g.monthly_minor), 0)::text from public.goals g join public.onboarding o on o.user_id = g.user_id where g.user_id = auth.uid() and o.month <= first_day),
      'income_count', (select count(*) from income_rows), 'expense_count', (select count(*) from expense_rows)
    )) into result;
  return result;
end; $$;
revoke all on function public.read_money_month(text, integer, integer) from public, anon, authenticated;
grant execute on function public.read_money_month(text, integer, integer) to authenticated;
