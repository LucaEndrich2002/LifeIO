-- Extend the initial setup with actual Plan tasks. Existing completed accounts
-- were never offered this step: preserve that fact without inventing a skip.
begin;
alter table public.onboarding add column tasks_status text not null default 'pending'
  check (tasks_status in ('pending', 'saved', 'skipped', 'not_offered'));
update public.onboarding set tasks_status = 'not_offered' where completed_at is not null;
alter table public.onboarding add constraint onboarding_tasks_completion
  check ((completed_at is null or tasks_status <> 'pending')
    and (tasks_status <> 'not_offered' or completed_at is not null));

alter table public.tasks add column onboarding_slot smallint
  check (onboarding_slot between 0 and 2);
alter table public.tasks add constraint tasks_owner_onboarding_slot unique (user_id, onboarding_slot);

-- Existing RLS and SELECT-only grants remain. This RPC accepts no owner or task ID.
-- Profile/onboarding locks serialize drafts; completed setup cannot be reopened.
create or replace function public.save_onboarding_step(p_step text, p_payload jsonb, p_revision integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  profile_zone text;
  state public.onboarding%rowtype;
  choice text := p_payload->>'decision';
  selected_month date;
  item jsonb;
  item_slot integer := 0;
  task_title text;
  task_due date;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_step is null or p_step not in ('income', 'expenses', 'goal', 'tasks', 'complete')
    or jsonb_typeof(p_payload) is distinct from 'object'
    or p_revision is null or p_revision < 0 or p_revision > 2147483646 then
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
    if state.income_status = 'pending' or state.expenses_status = 'pending' or state.goal_status = 'pending' or state.tasks_status = 'pending' then
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
  elsif p_step = 'tasks' then
    if state.income_status = 'pending' or state.expenses_status = 'pending' or state.goal_status = 'pending' then
      raise exception 'Financial decisions required' using errcode = '22023';
    end if;
    if p_payload - array['decision', 'items'] <> '{}'::jsonb then
      raise exception 'Invalid task payload' using errcode = '22023';
    end if;
    if choice = 'saved' then
      if jsonb_typeof(p_payload->'items') is distinct from 'array' then raise exception 'Invalid tasks' using errcode = '22023'; end if;
      if jsonb_array_length(p_payload->'items') not between 1 and 3 then raise exception 'Invalid task count' using errcode = '22023'; end if;
      for item in select value from jsonb_array_elements(p_payload->'items') loop
        if jsonb_typeof(item) is distinct from 'object' then raise exception 'Invalid task' using errcode = '22023'; end if;
        if item - array['title', 'priority', 'due_on'] <> '{}'::jsonb
          or jsonb_typeof(item->'title') is distinct from 'string'
          or jsonb_typeof(item->'priority') is distinct from 'string'
          or jsonb_typeof(item->'due_on') is distinct from 'string' then
          raise exception 'Invalid task fields' using errcode = '22023';
        end if;
        -- Match JavaScript trim and count Unicode characters, like mutate_task.
        task_title := btrim(item->>'title', U&'\0009\000a\000b\000c\000d\0020\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff');
        if char_length(task_title) not between 1 and 80 or item->>'priority' not in ('high', 'normal', 'low') then
          raise exception 'Invalid task values' using errcode = '22023';
        end if;
        task_due := null;
        if item->>'due_on' <> '' then
          if item->>'due_on' !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' then
            raise exception 'Invalid task date' using errcode = '22023';
          end if;
          task_due := (item->>'due_on')::date;
          if to_char(task_due, 'YYYY-MM-DD') <> item->>'due_on' then raise exception 'Invalid task date' using errcode = '22023'; end if;
        end if;
        insert into public.tasks (id, user_id, onboarding_slot, title, priority, due_on)
          values (gen_random_uuid(), owner_id, item_slot, task_title, item->>'priority', task_due)
          on conflict (user_id, onboarding_slot) do update
            set title = excluded.title, priority = excluded.priority, due_on = excluded.due_on;
        item_slot := item_slot + 1;
      end loop;
    end if;
    -- Only this user's draft slots; ordinary Plan tasks have no onboarding slot.
    delete from public.tasks where user_id = owner_id and onboarding_slot >= item_slot;
    update public.onboarding set tasks_status = choice where user_id = owner_id;
  end if;
  update public.onboarding set revision = revision + 1 where user_id = owner_id;
end; $$;
revoke all on function public.save_onboarding_step(text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.save_onboarding_step(text, jsonb, integer) to authenticated;
commit;
