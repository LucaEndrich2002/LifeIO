-- Uses the real pre-savings RPC. Synthetic account references, no Auth service.
begin;
insert into auth.users(id,email) values
  ('11111111-1111-4111-8111-111111111111','migration-complete@example.test'),
  ('22222222-2222-4222-8222-222222222222','migration-draft@example.test'),
  ('33333333-3333-4333-8333-333333333333','migration-skipped@example.test');
set local role authenticated;
do $$
declare actor uuid; historical_month text; opening bigint; monthly bigint;
begin
  foreach actor in array array['11111111-1111-4111-8111-111111111111'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'33333333-3333-4333-8333-333333333333'::uuid] loop
    perform set_config('request.jwt.claim.sub',actor::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
    historical_month := case when actor='11111111-1111-4111-8111-111111111111' then '2024-02' when actor='22222222-2222-4222-8222-222222222222' then '2025-11' else '2023-12' end;
    opening := case when actor='11111111-1111-4111-8111-111111111111' then 345678 else 765432 end;
    monthly := case when actor='11111111-1111-4111-8111-111111111111' then 12345 else 0 end;
    insert into public.profiles(user_id,display_name,time_zone) values(actor,'Fiktiver Altbestand','Europe/Berlin');
    perform public.save_onboarding_step('income',jsonb_build_object('decision','saved','name','Fiktives Einkommen','amount',280001,'month',historical_month),0);
    perform public.save_onboarding_step('expenses','{"decision":"saved","items":[{"name":"Fiktive Miete","amount":90001}]}',1);
    if actor='33333333-3333-4333-8333-333333333333' then
      perform public.save_onboarding_step('goal','{"decision":"skipped"}',2);
    else
      perform public.save_onboarding_step('goal',jsonb_build_object('decision','saved','name','Fiktive Reserve','target',1000000,'current',opening,'monthly',monthly),2);
    end if;
    if actor <> '22222222-2222-4222-8222-222222222222' then
      perform public.save_onboarding_step('complete','{}',3);
    end if;
  end loop;
end $$;
commit;
