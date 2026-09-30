create table public.calendar_events (
  id uuid primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  time_zone text not null check (public.is_supported_time_zone(time_zone)),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  check (isfinite(starts_at) and isfinite(ends_at)),
  check (date_trunc('minute',starts_at) = starts_at and date_trunc('minute',ends_at) = ends_at),
  check ((starts_at at time zone time_zone)::date between date '2000-01-01' and date '2100-12-31'),
  check ((ends_at at time zone time_zone)::date between date '2000-01-01' and date '2100-12-31')
);
create index calendar_events_owner_interval on public.calendar_events(user_id,starts_at,ends_at,id) where removed_at is null;
alter table public.calendar_events enable row level security;
revoke all on public.calendar_events from public,anon,authenticated;
grant select on public.calendar_events to authenticated;
create policy calendar_events_select_own on public.calendar_events for select to authenticated
  using (user_id = (select auth.uid()) and removed_at is null);

create function public.mutate_calendar_event(p_operation text,p_id uuid,p_revision integer,p_title text default '',p_starts_at timestamptz default null,p_ends_at timestamptz default null,p_time_zone text default 'UTC')
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); entry public.calendar_events%rowtype; title_value text;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_operation is null or p_operation not in ('create','update','remove') or p_id is null or p_revision is null or p_revision not between 0 and 2147483646
    then raise exception 'Invalid request' using errcode = '22023'; end if;
  perform 1 from public.profiles where user_id = owner_id for share;
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  select * into entry from public.calendar_events where user_id = owner_id and id = p_id for update;
  if p_operation in ('create','update') then
    title_value := btrim(p_title, U&'\0009\000a\000b\000c\000d\0020\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff');
    if title_value is null or char_length(title_value) not between 1 and 80 or p_time_zone is null or not public.is_supported_time_zone(p_time_zone)
      or p_starts_at is null or p_ends_at is null or not isfinite(p_starts_at) or not isfinite(p_ends_at) or p_ends_at <= p_starts_at
      then raise exception 'Invalid event' using errcode = '22023'; end if;
  end if;
  if p_operation = 'create' then
    if p_revision <> 0 then raise exception 'Invalid revision' using errcode = '22023'; end if;
    if entry.id is not null then
      if entry.removed_at is null and entry.revision = 0 and entry.title = title_value and entry.starts_at = p_starts_at and entry.ends_at = p_ends_at and entry.time_zone = p_time_zone then return; end if;
      raise exception 'Event already exists' using errcode = '40001';
    end if;
    insert into public.calendar_events(id,user_id,title,starts_at,ends_at,time_zone) values(p_id,owner_id,title_value,p_starts_at,p_ends_at,p_time_zone);
    return;
  end if;
  if entry.id is null then raise exception 'Event unavailable' using errcode = '42501'; end if;
  if entry.removed_at is not null then
    if p_operation = 'remove' then return; end if;
    raise exception 'Event unavailable' using errcode = '42501';
  end if;
  if entry.revision <> p_revision then raise exception 'Stale event' using errcode = '40001'; end if;
  if p_operation = 'remove' then
    update public.calendar_events set removed_at = now(),revision = revision + 1 where user_id = owner_id and id = p_id;
  else
    update public.calendar_events set title = title_value,starts_at = p_starts_at,ends_at = p_ends_at,time_zone = p_time_zone,revision = revision + 1 where user_id = owner_id and id = p_id;
  end if;
end; $$;
revoke all on function public.mutate_calendar_event(text,uuid,integer,text,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.mutate_calendar_event(text,uuid,integer,text,timestamptz,timestamptz,text) to authenticated;

create function public.read_calendar_events(p_start timestamptz,p_end timestamptz,p_page integer default 0)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_start is null or p_end is null or not isfinite(p_start) or not isfinite(p_end) or p_end < p_start or p_end - p_start > interval '9 days'
    or p_start < timestamptz '1999-12-20 00:00:00+00' or p_end > timestamptz '2101-01-10 00:00:00+00'
    or p_page is null or p_page not between 0 and 1000000 then raise exception 'Invalid range' using errcode = '22023'; end if;
  if not exists (select 1 from public.onboarding where user_id = auth.uid() and completed_at is not null)
    then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  with entries as (
    select id,title,starts_at,ends_at,time_zone,revision from public.calendar_events
    where user_id = auth.uid() and removed_at is null and p_start < p_end and starts_at < p_end and ends_at > p_start
  ), page as (select * from entries order by starts_at,id limit 25 offset p_page * 25)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by starts_at,id) from page p),'[]'::jsonb),'total',(select count(*) from entries)) into result;
  return result;
end; $$;
revoke all on function public.read_calendar_events(timestamptz,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.read_calendar_events(timestamptz,timestamptz,integer) to authenticated;
