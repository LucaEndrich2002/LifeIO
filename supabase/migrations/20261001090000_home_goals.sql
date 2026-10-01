-- Read-only, owner-scoped goal summaries. Financial values follow read_goal;
-- milestone counts cover every active row, not just a detail page.
create function public.read_home_goals(p_day text,p_page integer default 0)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare day_value date; result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_day is null or p_day !~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])-[0-9]{2}$'
    or p_page is null or p_page not between 0 and 1000000
    then raise exception 'Invalid request' using errcode = '22023'; end if;
  day_value := p_day::date;
  if to_char(day_value,'YYYY-MM-DD') <> p_day then raise exception 'Invalid day' using errcode = '22023'; end if;
  if not exists (select 1 from public.onboarding where user_id = auth.uid() and completed_at is not null)
    then raise exception 'Complete onboarding first' using errcode = '42501'; end if;
  with contributions as (
    select goal_id,sum(amount_minor) as amount from public.goal_contributions
      where user_id = auth.uid() and cancelled_at is null group by goal_id
  ), milestones as (
    select goal_id,count(*) as total,count(*) filter(where completed_at is not null) as completed
      from public.goal_milestones where user_id = auth.uid() and removed_at is null group by goal_id
  ), summaries as (
    select g.id,g.name,g.kind,g.deadline,g.target_minor,
      case when g.kind = 'financial' then (g.current_minor + coalesce(c.amount,0))::text end as balance,
      coalesce(m.total,0) as milestone_total,coalesce(m.completed,0) as milestone_completed,
      case when g.kind = 'financial' then g.current_minor + coalesce(c.amount,0) >= g.target_minor
        else coalesce(m.total,0) > 0 and m.completed = m.total end as reached
    from public.goals g left join contributions c on c.goal_id = g.id left join milestones m on m.goal_id = g.id
      where g.user_id = auth.uid()
  ), page as (select * from summaries order by reached,deadline nulls last,id limit 6 offset p_page * 6)
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object('rates',
      coalesce((select jsonb_agg(jsonb_build_object('month',r.month,'amount_minor',r.amount_minor) order by r.month)
        from public.goal_rates r where r.user_id = auth.uid() and r.goal_id = p.id),'[]'::jsonb))
      order by reached,deadline nulls last,id) from page p),'[]'::jsonb),
    'total',(select count(*) from summaries),
    'overdue',(select count(*) from summaries where not reached and deadline < day_value)
  ) into result;
  return result;
end; $$;
revoke all on function public.read_home_goals(text,integer) from public,anon,authenticated;
grant execute on function public.read_home_goals(text,integer) to authenticated;
