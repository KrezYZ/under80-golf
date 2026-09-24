-- Members may read only their own published round-by-round results.
-- Administrators retain full access for score management.
drop policy if exists results_member_read on public.event_results;
create policy results_member_read on public.event_results for select to authenticated
using (
  public.is_app_admin()
  or (
    exists (
      select 1
      from public.members m
      where m.id = event_results.member_id
        and lower(m.email) = lower(auth.jwt()->>'email')
    )
    and exists (
      select 1
      from public.events e
      where e.id = event_results.event_id
        and e.results_published = true
    )
  )
);

create or replace function public.get_my_event_results(p_year integer)
returns table(
  event_id uuid,
  event_name text,
  event_date date,
  stableford integer,
  "position" integer
)
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if not public.is_active_app_member() then
    raise exception 'Active membership required';
  end if;

  return query
  select e.id, e.name, e.date::date, r.stableford, r.position
  from public.event_results r
  join public.events e on e.id = r.event_id
  join public.members m on m.id = r.member_id
  where lower(m.email) = lower(auth.jwt()->>'email')
    and e.results_published = true
    and extract(year from e.date::date)::integer = p_year
  order by e.date::date desc, e.name;
end;
$$;

revoke all on function public.get_my_event_results(integer) from public, anon;
grant execute on function public.get_my_event_results(integer) to authenticated;
