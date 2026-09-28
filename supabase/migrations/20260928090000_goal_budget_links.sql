-- The first EntityLink is typed: Goal -> Budget (funded_by).
-- Composite foreign keys enforce ownership even outside application code.
alter table public.budgets add constraint budgets_owner_id unique(user_id,id);
create table public.entity_links (
  id uuid primary key,
  user_id uuid not null,
  goal_id uuid not null,
  budget_id uuid not null,
  relationship text not null default 'funded_by' check (relationship = 'funded_by'),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  foreign key (user_id,goal_id) references public.goals(user_id,id) on delete cascade,
  foreign key (user_id,budget_id) references public.budgets(user_id,id) on delete cascade
);
create unique index entity_links_active_pair on public.entity_links(user_id,goal_id,budget_id,relationship) where removed_at is null;
create index entity_links_goal_page on public.entity_links(user_id,goal_id,created_at desc,id) where removed_at is null;
create index entity_links_budget_page on public.entity_links(user_id,budget_id,created_at desc,id) where removed_at is null;
alter table public.entity_links enable row level security;
revoke all on public.entity_links from public,anon,authenticated;
grant select on public.entity_links to authenticated;
create policy entity_links_select_own on public.entity_links for select to authenticated
  using (user_id = (select auth.uid()) and removed_at is null);

create function public.mutate_goal_budget_link(p_operation text,p_id uuid,p_goal_id uuid,p_budget_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); entry public.entity_links%rowtype;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_operation is null or p_operation not in ('create','remove') or p_id is null or p_goal_id is null or p_budget_id is null
    then raise exception 'Invalid request' using errcode = '22023'; end if;
  perform 1 from public.profiles where user_id = owner_id for share;
  -- Budget deletion uses this same onboarding lock. No dangling link can survive.
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  perform 1 from public.goals where user_id = owner_id and id = p_goal_id for update;
  if not found then raise exception 'Goal unavailable' using errcode = '42501'; end if;
  perform 1 from public.budgets where user_id = owner_id and id = p_budget_id for update;
  if not found then raise exception 'Budget unavailable' using errcode = '42501'; end if;
  select * into entry from public.entity_links where user_id = owner_id and id = p_id for update;
  if entry.id is not null and (entry.goal_id <> p_goal_id or entry.budget_id <> p_budget_id)
    then raise exception 'Link unavailable' using errcode = '42501'; end if;
  if p_operation = 'create' then
    if entry.id is not null then
      if entry.removed_at is null then return; end if;
      raise exception 'Link already removed' using errcode = '40001';
    end if;
    if exists (select 1 from public.entity_links where user_id = owner_id and goal_id = p_goal_id and budget_id = p_budget_id and removed_at is null)
      then raise exception 'Already linked' using errcode = '40001'; end if;
    insert into public.entity_links(id,user_id,goal_id,budget_id) values(p_id,owner_id,p_goal_id,p_budget_id);
    return;
  end if;
  if entry.id is null then raise exception 'Link unavailable' using errcode = '42501'; end if;
  if entry.removed_at is not null then return; end if;
  -- Retain the request ID so a delayed create cannot resurrect a removed link.
  update public.entity_links set removed_at = now() where user_id = owner_id and id = p_id;
end; $$;
revoke all on function public.mutate_goal_budget_link(text,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.mutate_goal_budget_link(text,uuid,uuid,uuid) to authenticated;
