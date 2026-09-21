-- Extend the existing ledger; initial onboarding IDs are preserved.
alter table public.incomes alter column onboarding_slot drop not null;
alter table public.incomes add column revision integer not null default 0 check (revision >= 0);
alter table public.expenses alter column onboarding_slot drop not null;
alter table public.expenses alter column start_month drop not null;
alter table public.expenses drop constraint expenses_recurrence_check;
alter table public.expenses add column spent_on date;
alter table public.expenses add column category text;
alter table public.expenses add column revision integer not null default 0 check (revision >= 0);
alter table public.expenses add constraint expenses_shape check (
  (recurrence = 'monthly' and start_month is not null and spent_on is null and category is null)
  or (recurrence = 'once' and start_month is null and onboarding_slot is null
    and spent_on is not null and spent_on between date '2000-01-01' and date '2100-12-31'
    and category is not null and category in ('groceries', 'mobility', 'health', 'leisure', 'shopping', 'other'))
);
create index incomes_user_month on public.incomes(user_id, month, created_at, id);
create index expenses_user_date on public.expenses(user_id, spent_on, created_at, id) where recurrence = 'once';

create function public.mutate_money(p_kind text, p_operation text, p_id uuid, p_revision integer, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  income_row public.incomes%rowtype;
  expense_row public.expenses%rowtype;
  entry_name text;
  entry_amount bigint;
  entry_date date;
  entry_category text;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('income', 'expense') or p_operation is null or p_operation not in ('create', 'update', 'delete')
    or p_id is null or p_revision is null or p_revision < 0 or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  if p_operation <> 'delete' then
    if jsonb_typeof(p_payload->'name') is distinct from 'string' then raise exception 'Invalid name' using errcode = '22023'; end if;
    entry_name := btrim(p_payload->>'name');
    if char_length(entry_name) not between 1 and 80 then raise exception 'Invalid name' using errcode = '22023'; end if;
    entry_amount := public.onboarding_amount(p_payload->'amount');
    if p_kind = 'income' then
      if (p_payload->>'month') is null or (p_payload->>'month') !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$' then raise exception 'Invalid month' using errcode = '22023'; end if;
      entry_date := ((p_payload->>'month') || '-01')::date;
    else
      if (p_payload->>'spent_on') is null or (p_payload->>'spent_on') !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])-[0-9]{2}$' then raise exception 'Invalid date' using errcode = '22023'; end if;
      entry_date := (p_payload->>'spent_on')::date;
      entry_category := p_payload->>'category';
      if entry_category is null or entry_category not in ('groceries', 'mobility', 'health', 'leisure', 'shopping', 'other') then raise exception 'Invalid category' using errcode = '22023'; end if;
    end if;
  end if;
  if p_kind = 'income' then
    select * into income_row from public.incomes where id = p_id and user_id = owner_id for update;
    if p_operation = 'create' then
      if p_revision <> 0 then raise exception 'Invalid revision' using errcode = '22023'; end if;
      if found then
        if income_row.revision = 0 and income_row.name = entry_name and income_row.amount_minor = entry_amount and income_row.month = entry_date then return; end if;
        raise exception 'Entry already exists' using errcode = '40001';
      end if;
      insert into public.incomes (id, user_id, onboarding_slot, name, amount_minor, month) values (p_id, owner_id, null, entry_name, entry_amount, entry_date);
    else
      if not found then raise exception 'Entry unavailable' using errcode = '42501'; end if;
      if income_row.revision <> p_revision then raise exception 'Stale entry' using errcode = '40001'; end if;
      if p_operation = 'delete' then delete from public.incomes where id = p_id and user_id = owner_id;
      else update public.incomes set name = entry_name, amount_minor = entry_amount, month = entry_date, revision = revision + 1 where id = p_id and user_id = owner_id; end if;
    end if;
  else
    select * into expense_row from public.expenses where id = p_id and user_id = owner_id and recurrence = 'once' for update;
    if p_operation = 'create' then
      if p_revision <> 0 then raise exception 'Invalid revision' using errcode = '22023'; end if;
      if found then
        if expense_row.revision = 0 and expense_row.name = entry_name and expense_row.amount_minor = entry_amount and expense_row.spent_on = entry_date and expense_row.category = entry_category then return; end if;
        raise exception 'Entry already exists' using errcode = '40001';
      end if;
      insert into public.expenses (id, user_id, onboarding_slot, name, amount_minor, recurrence, spent_on, category)
        values (p_id, owner_id, null, entry_name, entry_amount, 'once', entry_date, entry_category);
    else
      if not found then raise exception 'Entry unavailable' using errcode = '42501'; end if;
      if expense_row.revision <> p_revision then raise exception 'Stale entry' using errcode = '40001'; end if;
      if p_operation = 'delete' then delete from public.expenses where id = p_id and user_id = owner_id;
      else update public.expenses set name = entry_name, amount_minor = entry_amount, spent_on = entry_date, category = entry_category, revision = revision + 1 where id = p_id and user_id = owner_id; end if;
    end if;
  end if;
end; $$;
revoke all on function public.mutate_money(text, text, uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.mutate_money(text, text, uuid, integer, jsonb) to authenticated;

-- One statement/snapshot, full aggregates, deterministic pages of 25 entries.
-- Invoker rights retain RLS. Integer aggregates travel as strings to avoid JSON rounding.
create function public.read_money_month(p_month text, p_income_page integer default 0, p_expense_page integer default 0)
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
  fixed_rows as (select * from public.expenses where user_id = auth.uid() and recurrence = 'monthly' and start_month <= first_day),
  income_page as (select id, name, amount_minor, month, revision from income_rows order by created_at desc, id limit 25 offset p_income_page * 25),
  expense_page as (select id, name, amount_minor, spent_on, category, revision from expense_rows order by spent_on desc, created_at desc, id limit 25 offset p_expense_page * 25)
  select jsonb_build_object(
    'incomes', coalesce((select jsonb_agg(to_jsonb(r)) from income_page r), '[]'::jsonb),
    'expenses', coalesce((select jsonb_agg(to_jsonb(r)) from expense_page r), '[]'::jsonb),
    'fixed', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'amount_minor', amount_minor, 'start_month', start_month) order by onboarding_slot, id) from fixed_rows), '[]'::jsonb),
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
