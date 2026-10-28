-- Run on source and restored databases; roll back the positive write control.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
do $$
declare tab text; own_count bigint; foreign_count bigint;
begin
  foreach tab in array array['profiles','onboarding','incomes','expenses','budgets','goals','goal_rates','goal_contributions','goal_milestones','tasks','calendar_events','entity_links','weekly_reviews','notifications','ai_request_limits'] loop
    execute format('select count(*),count(*) filter(where user_id <> auth.uid()) from public.%I',tab) into own_count,foreign_count;
    if own_count=0 or foreign_count<>0 then raise exception 'Owner isolation failed'; end if;
  end loop;
  if (select count(*) from public.tasks) <> 1 then raise exception 'Soft-deleted or foreign tasks visible'; end if;
  begin
    perform public.mutate_task('complete','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',0);
    raise exception 'Foreign mutation unexpectedly accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from auth.users;
    raise exception 'Auth records unexpectedly readable';
  exception when insufficient_privilege then null; end;
  perform public.mutate_task('complete','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',0);
  if not exists(select 1 from public.tasks where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and revision=1 and completed_at is not null) then
    raise exception 'Owner write control failed';
  end if;
end $$;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
do $$ begin
  if (select count(*) from public.tasks) <> 1 or not exists(select 1 from public.tasks where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and revision=0 and completed_at is null) then
    raise exception 'Foreign task changed';
  end if;
end $$;
set local role anon;
set local request.jwt.claim.sub = '';
set local request.jwt.claims = '{}';
do $$ begin
  begin perform 1 from public.tasks; raise exception 'Anonymous read accepted';
  exception when insufficient_privilege then null; end;
  begin perform public.mutate_task('complete','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',0); raise exception 'Anonymous write accepted';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
