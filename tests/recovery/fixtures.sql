-- Synthetic database references only; this is not an Auth-service/login test.
begin;
insert into auth.users(id,email) values
  ('11111111-1111-4111-8111-111111111111','restore-owner@example.test'),
  ('22222222-2222-4222-8222-222222222222','restore-other@example.test');
set local role authenticated;
do $$
declare actor uuid; goal uuid; budget uuid; task uuid; event uuid;
begin
  foreach actor in array array['11111111-1111-4111-8111-111111111111'::uuid,'22222222-2222-4222-8222-222222222222'::uuid] loop
    perform set_config('request.jwt.claim.sub',actor::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
    insert into public.profiles(user_id,display_name,time_zone) values(actor,'Fiktive Sicherungsprobe','Europe/Berlin');
    perform public.save_onboarding_step('income','{"decision":"saved","name":"Fiktives Einkommen","amount":280000,"month":"2026-09"}',0);
    perform public.save_onboarding_step('expenses','{"decision":"saved","items":[{"name":"Fiktive Miete","amount":90000}]}',1);
    perform public.save_onboarding_step('goal','{"decision":"saved","name":"Fiktive Reserve","target":1000000,"current":350000,"monthly":50000}',2);
    perform public.save_onboarding_step('tasks','{"decision":"skipped"}',3);
    perform public.save_onboarding_step('complete','{}',4);
    select id into strict goal from public.goals where user_id=actor;
    perform public.mutate_goal('contribute',goal,gen_random_uuid(),0,'{"amount":12345,"date":"2026-10-04","note":"Fiktive Einzahlung"}');
    perform public.mutate_goal_milestone('create',goal,gen_random_uuid(),0,'Fiktiver Meilenstein');
    budget := gen_random_uuid();
    perform public.mutate_budget('create',budget,0,'{"name":"Fiktives Budget","amount":50000,"month":"2026-09"}');
    perform public.mutate_goal_budget_link('create',gen_random_uuid(),goal,budget);
    task := case when actor='11111111-1111-4111-8111-111111111111' then 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid else 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid end;
    perform public.mutate_task('create',task,0,'Fiktive offene Aufgabe','normal',((now() at time zone 'Europe/Berlin')::date - 1)::text);
    perform public.mutate_goal_plan_link('create',gen_random_uuid(),goal,'task',task);
    task := gen_random_uuid();
    perform public.mutate_task('create',task,0,'Fiktive entfernte Aufgabe');
    perform public.mutate_task('remove',task,0);
    event := gen_random_uuid();
    perform public.mutate_calendar_event('create',event,0,'Fiktiver Termin','2026-09-28T21:30:00Z','2026-09-29T22:00:00Z','Europe/Berlin');
    perform public.mutate_goal_plan_link('create',gen_random_uuid(),goal,'event',event);
    perform public.generate_weekly_review('2026-09-28',-1);
    perform public.synchronize_notifications();
    perform public.claim_ai_request(); -- Database counter only; no provider call.
  end loop;
end $$;
commit;
