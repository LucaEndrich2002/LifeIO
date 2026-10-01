-- Extend typed links without weakening Goal -> Budget integrity.
alter table public.tasks add constraint tasks_owner_id unique(user_id,id);
alter table public.calendar_events add constraint calendar_events_owner_id unique(user_id,id);
alter table public.entity_links alter column budget_id drop not null;
alter table public.entity_links drop constraint entity_links_relationship_check;
alter table public.entity_links
  add column task_id uuid,
  add column calendar_event_id uuid,
  add foreign key (user_id,task_id) references public.tasks(user_id,id) on delete cascade,
  add foreign key (user_id,calendar_event_id) references public.calendar_events(user_id,id) on delete cascade,
  add constraint entity_links_typed_endpoints check (
    (relationship = 'funded_by' and budget_id is not null and task_id is null and calendar_event_id is null)
    or (relationship = 'requires' and budget_id is null and task_id is not null and calendar_event_id is null)
    or (relationship = 'scheduled_as' and budget_id is null and task_id is null and calendar_event_id is not null)
  );
create unique index entity_links_active_task on public.entity_links(user_id,goal_id,task_id) where removed_at is null and relationship = 'requires';
create unique index entity_links_active_event on public.entity_links(user_id,goal_id,calendar_event_id) where removed_at is null and relationship = 'scheduled_as';
create index entity_links_task_page on public.entity_links(user_id,task_id,created_at desc,id) where removed_at is null and relationship = 'requires';
create index entity_links_event_page on public.entity_links(user_id,calendar_event_id,created_at desc,id) where removed_at is null and relationship = 'scheduled_as';

-- Soft deletion must invalidate links just as physical FK cascades do.
create function public.remove_plan_endpoint_links()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'tasks' then
    update public.entity_links set removed_at = new.removed_at
      where user_id = new.user_id and task_id = new.id and removed_at is null;
  elsif tg_table_name = 'calendar_events' then
    update public.entity_links set removed_at = new.removed_at
      where user_id = new.user_id and calendar_event_id = new.id and removed_at is null;
  end if;
  return new;
end; $$;
revoke all on function public.remove_plan_endpoint_links() from public,anon,authenticated;
create trigger tasks_remove_links after update of removed_at on public.tasks
  for each row when (old.removed_at is null and new.removed_at is not null)
  execute function public.remove_plan_endpoint_links();
create trigger calendar_events_remove_links after update of removed_at on public.calendar_events
  for each row when (old.removed_at is null and new.removed_at is not null)
  execute function public.remove_plan_endpoint_links();

create function public.mutate_goal_plan_link(p_operation text,p_id uuid,p_goal_id uuid,p_kind text,p_target_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); entry public.entity_links%rowtype; relation text;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_operation is null or p_operation not in ('create','remove') or p_id is null or p_goal_id is null or p_target_id is null or p_kind is null or p_kind not in ('task','event')
    then raise exception 'Invalid request' using errcode = '22023'; end if;
  relation := case when p_kind = 'task' then 'requires' else 'scheduled_as' end;
  perform 1 from public.profiles where user_id = owner_id for share;
  -- All endpoint mutations take this lock too: removal and linking serialize.
  perform 1 from public.onboarding where user_id = owner_id and completed_at is not null for update;
  if not found then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  perform 1 from public.goals where user_id = owner_id and id = p_goal_id for update;
  if not found then raise exception 'Goal unavailable' using errcode = '42501'; end if;
  if p_kind = 'task' then
    perform 1 from public.tasks where user_id = owner_id and id = p_target_id and removed_at is null for update;
  else
    perform 1 from public.calendar_events where user_id = owner_id and id = p_target_id and removed_at is null for update;
  end if;
  if not found then raise exception 'Endpoint unavailable' using errcode = '42501'; end if;
  select * into entry from public.entity_links where user_id = owner_id and id = p_id for update;
  if entry.id is not null and (entry.goal_id is distinct from p_goal_id or entry.relationship is distinct from relation
    or (case when p_kind = 'task' then entry.task_id else entry.calendar_event_id end) is distinct from p_target_id)
    then raise exception 'Link unavailable' using errcode = '42501'; end if;
  if p_operation = 'create' then
    if entry.id is not null then
      if entry.removed_at is null then return; end if;
      raise exception 'Link already removed' using errcode = '40001';
    end if;
    if exists (select 1 from public.entity_links where user_id = owner_id and goal_id = p_goal_id and relationship = relation and removed_at is null
      and (case when p_kind = 'task' then task_id else calendar_event_id end) = p_target_id)
      then raise exception 'Already linked' using errcode = '40001'; end if;
    insert into public.entity_links(id,user_id,goal_id,relationship,task_id,calendar_event_id)
      values(p_id,owner_id,p_goal_id,relation,case when p_kind = 'task' then p_target_id end,case when p_kind = 'event' then p_target_id end);
    return;
  end if;
  if entry.id is null then raise exception 'Link unavailable' using errcode = '42501'; end if;
  if entry.removed_at is not null then return; end if;
  update public.entity_links set removed_at = now() where user_id = owner_id and id = p_id;
end; $$;
revoke all on function public.mutate_goal_plan_link(text,uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.mutate_goal_plan_link(text,uuid,uuid,text,uuid) to authenticated;

-- Keep the existing budget RPC restricted to its own typed relationship.
create or replace function public.mutate_goal_budget_link(p_operation text,p_id uuid,p_goal_id uuid,p_budget_id uuid)
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
  if entry.id is not null and (entry.relationship is distinct from 'funded_by' or entry.goal_id is distinct from p_goal_id or entry.budget_id is distinct from p_budget_id)
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
