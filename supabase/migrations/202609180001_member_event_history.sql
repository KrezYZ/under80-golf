-- Include historical events while keeping registration identities private.
create or replace function public.get_events_public()
returns table(id uuid,name text,date date,"time" time,meeting_time time,location text,status text,notes text,registration_deadline timestamptz,capacity integer,results_published boolean,attendee_count integer,is_registered boolean)
language plpgsql stable security definer set search_path=public,auth as $$
begin
  if not public.is_active_app_member() then raise exception 'Active membership required'; end if;
  return query select e.id,e.name,e.date::date,nullif(e.time::text,'')::time,e.meeting_time,e.location,e.status,e.notes,e.registration_deadline,e.capacity,e.results_published,
    (select count(*)::integer from public.event_registrations r where r.event_id=e.id and r.status='registered'),
    exists(select 1 from public.event_registrations r where r.event_id=e.id and r.user_id=auth.uid() and r.status='registered')
  from public.events e order by e.date desc;
end $$;
revoke all on function public.get_events_public() from public,anon;
grant execute on function public.get_events_public() to authenticated;
