-- Registered players may view the complete lineup for their event.
-- Only administrators can edit tee assignments.
create or replace function public.get_event_lineup(p_event_id uuid)
returns table(
  id uuid,
  event_id uuid,
  member_id uuid,
  member_name text,
  licencia text,
  group_name text,
  tee text,
  tee_time time,
  notes text,
  is_my_group boolean
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  my_member_id uuid;
  my_group text;
begin
  if not public.is_app_admin() and not exists (
    select 1 from public.event_registrations r
    where r.event_id = p_event_id and r.user_id = auth.uid() and r.status = 'registered'
  ) then
    raise exception 'Registration required to view lineup';
  end if;

  select r.member_id into my_member_id
  from public.event_registrations r
  where r.event_id = p_event_id and r.user_id = auth.uid() and r.status = 'registered'
  limit 1;

  select t.group_name into my_group
  from public.tee_assignments t
  where t.event_id = p_event_id and t.member_id = my_member_id
  limit 1;

  return query
  select t.id, t.event_id, t.member_id, m.name, m.licencia,
         t.group_name, t.tee, t.tee_time, t.notes,
         (my_group is not null and my_group <> '' and t.group_name = my_group)
  from public.tee_assignments t
  join public.members m on m.id = t.member_id
  where t.event_id = p_event_id
  order by t.tee_time nulls last, t.group_name, m.name;
end;
$$;

revoke all on function public.get_event_lineup(uuid) from public, anon;
grant execute on function public.get_event_lineup(uuid) to authenticated;

-- Include every member in the annual table, using zero when no published score exists.
create or replace function public.get_annual_stableford_ranking(p_year integer)
returns table(year integer, member_id uuid, name text, licencia text, events_played integer, total_stableford integer, best_round integer, average_stableford numeric, ranking integer)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.is_active_app_member() then raise exception 'Active membership required'; end if;
  return query
  select p_year,
         m.id,
         m.name,
         m.licencia,
         count(e.id)::integer,
         coalesce(sum(r.stableford) filter (where e.id is not null), 0)::integer,
         coalesce(max(r.stableford) filter (where e.id is not null), 0)::integer,
         coalesce(round(avg(r.stableford) filter (where e.id is not null), 2), 0)::numeric,
         rank() over (
           order by coalesce(sum(r.stableford) filter (where e.id is not null), 0) desc,
                    coalesce(max(r.stableford) filter (where e.id is not null), 0) desc,
                    m.name
         )::integer
  from public.members m
  left join public.event_results r on r.member_id = m.id
  left join public.events e on e.id = r.event_id
    and e.results_published = true
    and extract(year from e.date::date)::integer = p_year
  group by m.id, m.name, m.licencia
  order by 9, m.name;
end $$;
