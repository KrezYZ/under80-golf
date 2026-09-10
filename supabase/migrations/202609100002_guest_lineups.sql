-- Preserve complete imported lineups, including invited players without member records.
alter table public.tee_assignments alter column member_id drop not null;
alter table public.tee_assignments add column if not exists guest_name text not null default '';
alter table public.tee_assignments add column if not exists licencia_snapshot text not null default '';
alter table public.tee_assignments add column if not exists sort_order integer not null default 0;

drop function if exists public.get_event_lineup(uuid);

create function public.get_event_lineup(p_event_id uuid)
returns table(
  id uuid, event_id uuid, member_id uuid, member_name text, licencia text,
  group_name text, tee text, tee_time time, notes text, is_my_group boolean,
  is_guest boolean, sort_order integer
)
language plpgsql stable security definer set search_path = public, auth as $$
declare my_member_id uuid; my_group text;
begin
  if not public.is_app_admin() and not exists (
    select 1 from public.event_registrations r
    where r.event_id=p_event_id and r.user_id=auth.uid() and r.status='registered'
  ) then raise exception 'Registration required to view lineup'; end if;

  select r.member_id into my_member_id from public.event_registrations r
  where r.event_id=p_event_id and r.user_id=auth.uid() and r.status='registered' limit 1;
  select t.group_name into my_group from public.tee_assignments t
  where t.event_id=p_event_id and t.member_id=my_member_id limit 1;

  return query select t.id,t.event_id,t.member_id,
    coalesce(m.name,nullif(t.guest_name,''),'Invitado'),
    coalesce(nullif(m.licencia,''),t.licencia_snapshot),
    t.group_name,t.tee,t.tee_time,t.notes,
    (my_group is not null and my_group<>'' and t.group_name=my_group),
    (t.member_id is null),t.sort_order
  from public.tee_assignments t left join public.members m on m.id=t.member_id
  where t.event_id=p_event_id
  order by t.tee_time nulls last,t.group_name,t.sort_order,coalesce(m.name,t.guest_name);
end $$;

revoke all on function public.get_event_lineup(uuid) from public, anon;
grant execute on function public.get_event_lineup(uuid) to authenticated;

create or replace function public.replace_event_lineup(p_event_id uuid, p_rows jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare inserted integer;
begin
  if not public.is_app_admin() then raise exception 'Administrator required'; end if;
  if not exists(select 1 from public.events where id=p_event_id) then raise exception 'Event not found'; end if;
  delete from public.tee_assignments where event_id=p_event_id;
  insert into public.tee_assignments(event_id,member_id,guest_name,licencia_snapshot,group_name,tee,tee_time,notes,sort_order)
  select p_event_id,
    nullif(item->>'member_id','')::uuid,
    coalesce(item->>'name',''),coalesce(item->>'licencia',''),
    coalesce(item->>'group_name',''),coalesce(item->>'tee',''),
    nullif(item->>'tee_time','')::time,'',coalesce(nullif(item->>'sort_order','')::integer,ordinality::integer)
  from jsonb_array_elements(p_rows) with ordinality as rows(item,ordinality);
  get diagnostics inserted=row_count;
  return inserted;
end $$;

revoke all on function public.replace_event_lineup(uuid,jsonb) from public,anon;
grant execute on function public.replace_event_lineup(uuid,jsonb) to authenticated;
