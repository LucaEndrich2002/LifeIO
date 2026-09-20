-- The first private application table. No auth metadata is trusted as profile data.
create function public.is_supported_time_zone(candidate text)
returns boolean language sql stable security invoker set search_path = ''
as $$ select exists (select 1 from pg_catalog.pg_timezone_names where name = candidate); $$;
revoke all on function public.is_supported_time_zone(text) from public, anon;
grant execute on function public.is_supported_time_zone(text) to authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  time_zone text not null check (public.is_supported_time_zone(time_zone)),
  currency text not null default 'EUR' check (currency = 'EUR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_profile_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
revoke all on function public.set_profile_updated_at() from public, anon, authenticated;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_profile_updated_at();

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (user_id, display_name, time_zone, currency) on public.profiles to authenticated;
grant update (user_id, display_name, time_zone, currency) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
