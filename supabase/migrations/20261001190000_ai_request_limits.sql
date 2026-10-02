-- Counters only: never store questions, answers, provider keys or financial data.
create table public.ai_request_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  day date not null,
  attempts integer not null check (attempts between 1 and 20),
  last_requested_at timestamptz not null
);
alter table public.ai_request_limits enable row level security;
revoke all on public.ai_request_limits from public, anon, authenticated;
grant select on public.ai_request_limits to authenticated;
create policy ai_request_limits_read_own on public.ai_request_limits for select to authenticated using ((select auth.uid()) = user_id);

-- This narrow definer function owns the counter; clients cannot reset it.
-- No owner argument, payload, dynamic SQL or application-data writes.
create function public.claim_ai_request() returns boolean
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); moment timestamptz := clock_timestamp(); claimed uuid;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.onboarding where user_id = actor and completed_at is not null)
    then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  insert into public.ai_request_limits as limits (user_id,day,attempts,last_requested_at)
    values (actor,(moment at time zone 'UTC')::date,1,moment)
  on conflict (user_id) do update set
    day = excluded.day,
    attempts = case when limits.day = excluded.day then limits.attempts + 1 else 1 end,
    last_requested_at = excluded.last_requested_at
  where limits.last_requested_at <= moment - interval '30 seconds'
    and (limits.day <> excluded.day or limits.attempts < 20)
  returning user_id into claimed;
  return claimed is not null;
end; $$;
revoke all on function public.claim_ai_request() from public, anon, authenticated;
grant execute on function public.claim_ai_request() to authenticated;
