-- Run immediately after savings migration and again after every later migration.
-- All positive mutations roll back, preserving the same legacy dataset.
begin;
do $$
declare completed_goal uuid; draft_goal uuid; deposit uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
begin
  select id into strict completed_goal from public.goals where user_id='11111111-1111-4111-8111-111111111111';
  select id into strict draft_goal from public.goals where user_id='22222222-2222-4222-8222-222222222222';
  if (select count(*) from public.goals) <> 2 or exists(select 1 from public.goals where revision<>0 or deadline is not null) then
    raise exception 'Unexpected goals or new-field defaults';
  end if;
  if (select count(*) from public.goal_rates) <> 1 or not exists(select 1 from public.goal_rates where goal_id=completed_goal and user_id='11111111-1111-4111-8111-111111111111' and month=date '2024-02-01' and amount_minor=12345) then
    raise exception 'Completed goal backfill incorrect or draft/skip rate invented';
  end if;
  if exists(select 1 from public.goal_contributions) then raise exception 'Opening balance became a deposit'; end if;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
  perform set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
  if (select count(*) from public.goals) <> 1 or public.read_goal(draft_goal) is not null or (select count(*) from public.goal_rates) <> 1 then
    raise exception 'Foreign goal or rate visible';
  end if;
  if (public.read_money_month('2024-01')->'totals'->>'savings')::bigint is distinct from 0 or (public.read_money_month('2024-02')->'totals'->>'savings')::bigint is distinct from 12345 then
    raise exception 'Historical savings boundary changed';
  end if;
  begin
    perform public.mutate_goal('contribute',draft_goal,deposit,0,'{"amount":99,"date":"2024-02-29","note":"Fiktiv"}');
    raise exception 'Foreign mutation accepted';
  exception when insufficient_privilege then null; end;
  perform public.mutate_goal('contribute',completed_goal,deposit,0,'{"amount":99,"date":"2024-02-29","note":"Fiktiv"}');
  if (public.read_goal(completed_goal)->>'balance')::bigint is distinct from 345777 or not exists(select 1 from public.goals where id=completed_goal and current_minor=345678 and revision=1) then
    raise exception 'Deposit changed opening balance or was not applied';
  end if;
  perform public.mutate_goal('update',completed_goal,deposit,1,'{"name":"Fiktive Reserve","target":1000000,"opening":345678,"monthly":23456,"month":"2024-03"}');
  if (select count(*) from public.goal_rates) <> 2 or (public.read_money_month('2024-02')->'totals'->>'savings')::bigint is distinct from 12345 or (public.read_money_month('2024-03')->'totals'->>'savings')::bigint is distinct from 23456 then
    raise exception 'New rate overwrote historical savings';
  end if;

  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
  perform set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
  if (select count(*) from public.goals) <> 1 or exists(select 1 from public.goal_rates) or exists(select 1 from public.goal_contributions) or public.read_goal(completed_goal) is not null then
    raise exception 'Draft sees another account data or has premature rates';
  end if;
  -- Later V1 adds an explicit task decision; completed legacy accounts keep not_offered.
  if exists(select 1 from pg_attribute where attrelid='public.onboarding'::regclass and attname='tasks_status' and not attisdropped) then
    perform public.save_onboarding_step('tasks','{"decision":"skipped"}',3);
    perform public.save_onboarding_step('complete','{}',4);
  else
    perform public.save_onboarding_step('complete','{}',3);
  end if;
  perform public.save_onboarding_step('complete','{}',0); -- Existing idempotent completion.
  if (select count(*) from public.goal_rates) <> 1 or not exists(select 1 from public.goal_rates where goal_id=draft_goal and user_id=auth.uid() and month=date '2025-11-01' and amount_minor=0) then
    raise exception 'Resumed setup failed to create exactly one historical zero rate';
  end if;
  if exists(select 1 from public.goal_contributions) or (public.read_goal(draft_goal)->>'balance')::bigint is distinct from 765432 then
    raise exception 'Draft opening balance changed';
  end if;
  begin
    perform public.mutate_goal('contribute',completed_goal,deposit,2,'{"amount":99,"date":"2024-02-29","note":"Fiktiv"}');
    raise exception 'Reverse foreign mutation accepted';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
  perform set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
  perform public.save_onboarding_step('complete','{}',0);
  if exists(select 1 from public.goals) or exists(select 1 from public.goal_rates) or exists(select 1 from public.goal_contributions) then
    raise exception 'Explicit skip manufactured records or exposed foreign data';
  end if;
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  begin perform 1 from public.goal_rates; raise exception 'Anonymous rate read accepted';
  exception when insufficient_privilege then null; end;
  begin perform public.mutate_goal('contribute',completed_goal,deposit,2,'{"amount":99,"date":"2024-02-29","note":"Fiktiv"}'); raise exception 'Anonymous write accepted';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
