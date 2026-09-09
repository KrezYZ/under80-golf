-- Under 80 club portal: authorization, registrations, tee times and Stableford ranking.
-- Additive migration: existing members, events, transactions and backups are preserved.

create table if not exists public.app_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

insert into public.app_user_roles (user_id, role)
select id, 'admin' from auth.users
where lower(email) in ('yuan_cristina@hotmail.com', 'jibeimaoyi@163.com')
on conflict (user_id) do update set role = excluded.role;

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select exists(select 1 from public.app_user_roles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_active_member_email(p_email text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.members
    where lower(trim(email)) = lower(trim(p_email)) and status = 'active'
  );
$$;

create or replace function public.is_active_app_member()
returns boolean language sql stable security definer set search_path = public, auth
as $$ select public.is_app_admin() or public.is_active_member_email(auth.jwt()->>'email'); $$;

create or replace function public.get_member_directory()
returns table(id uuid, name text, licencia text)
language sql stable security definer set search_path = public
as $$
  select m.id, m.name, m.licencia from public.members m
  where public.is_active_app_member() order by m.name;
$$;

create or replace function public.get_my_member_identity()
returns table(id uuid, name text, licencia text)
language sql stable security definer set search_path = public, auth
as $$
  select m.id, m.name, m.licencia from public.members m
  where m.status='active' and lower(m.email)=lower(auth.jwt()->>'email') limit 1;
$$;

alter table public.events add column if not exists meeting_time time;
alter table public.events add column if not exists registration_deadline timestamptz;
alter table public.events add column if not exists capacity integer check (capacity is null or capacity > 0);
alter table public.events add column if not exists results_published boolean not null default false;

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  status text not null default 'registered' check (status in ('registered','cancelled')),
  registered_at timestamptz not null default now(),
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create table if not exists public.tee_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  group_name text not null default '',
  tee text not null default '',
  tee_time time,
  notes text not null default '',
  unique(event_id, member_id)
);

create table if not exists public.event_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  stableford integer not null check (stableford between 0 and 100),
  gross_score integer check (gross_score is null or gross_score between 1 and 300),
  handicap_playing numeric(5,1),
  position integer check (position is null or position > 0),
  source text not null default 'manual' check (source in ('manual','golf_directo')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, member_id)
);

create or replace view public.annual_stableford_ranking
with (security_barrier = true) as
select extract(year from e.date::date)::integer as year, r.member_id, m.name, m.licencia,
       count(*)::integer as events_played, sum(r.stableford)::integer as total_stableford,
       max(r.stableford)::integer as best_round,
       round(avg(r.stableford), 2) as average_stableford,
       rank() over (
         partition by extract(year from e.date::date)
         order by sum(r.stableford) desc, max(r.stableford) desc
       )::integer as ranking
from public.event_results r
join public.events e on e.id = r.event_id and e.results_published = true
join public.members m on m.id = r.member_id
group by extract(year from e.date::date), r.member_id, m.name, m.licencia;

create or replace function public.get_annual_stableford_ranking(p_year integer)
returns table(year integer, member_id uuid, name text, licencia text, events_played integer, total_stableford integer, best_round integer, average_stableford numeric, ranking integer)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.is_active_app_member() then raise exception 'Active membership required'; end if;
  return query select v.year,v.member_id,v.name,v.licencia,v.events_played,v.total_stableford,v.best_round,v.average_stableford,v.ranking
  from public.annual_stableford_ranking v where v.year=p_year order by v.ranking;
end $$;

create or replace function public.get_events_public()
returns table(id uuid,name text,date date,"time" time,meeting_time time,location text,status text,notes text,registration_deadline timestamptz,capacity integer,results_published boolean,attendee_count integer,is_registered boolean)
language plpgsql stable security definer set search_path=public,auth as $$
begin
  if not public.is_active_app_member() then raise exception 'Active membership required'; end if;
  return query select e.id,e.name,e.date::date,e.time::time,e.meeting_time,e.location,e.status,e.notes,e.registration_deadline,e.capacity,e.results_published,
    (select count(*)::integer from public.event_registrations r where r.event_id=e.id and r.status='registered'),
    exists(select 1 from public.event_registrations r where r.event_id=e.id and r.user_id=auth.uid() and r.status='registered')
  from public.events e order by e.date desc;
end $$;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  event_id uuid references public.events(id) on delete cascade,
  read_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- Migrate legacy attendee email lists without deleting the original field.
insert into public.event_registrations(event_id, user_id, member_id)
select e.id, u.id, m.id
from public.events e
cross join lateral jsonb_array_elements_text(coalesce(nullif(e.attendees, '')::jsonb, '[]'::jsonb)) a(email)
join auth.users u on lower(u.email) = lower(a.email)
left join public.members m on lower(m.email) = lower(a.email)
on conflict(event_id, user_id) do nothing;

alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.transactions enable row level security;
alter table public.event_registrations enable row level security;
alter table public.tee_assignments enable row level security;
alter table public.event_results enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.app_user_roles enable row level security;

-- Replace every legacy policy on the protected tables. Permissive policies are ORed,
-- so leaving even one old "read_all" policy would expose private data.
do $$ declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname='public' and tablename in
      ('members','events','transactions','event_registrations','tee_assignments','event_results','push_subscriptions','notifications','app_user_roles')
  loop execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename); end loop;
end $$;

drop policy if exists members_select on public.members;
drop policy if exists members_insert on public.members;
drop policy if exists members_update on public.members;
drop policy if exists members_delete on public.members;
create policy members_admin_select on public.members for select to authenticated using (public.is_app_admin());
create policy members_admin_insert on public.members for insert to authenticated with check (public.is_app_admin());
create policy members_admin_update on public.members for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy members_admin_delete on public.members for delete to authenticated using (public.is_app_admin());

drop policy if exists events_read on public.events;
drop policy if exists events_write on public.events;
create policy events_member_read on public.events for select to authenticated using (public.is_active_app_member());
create policy events_admin_write on public.events for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists transactions_read on public.transactions;
drop policy if exists transactions_write on public.transactions;
create policy transactions_member_read on public.transactions for select to authenticated using (public.is_active_app_member());
create policy transactions_admin_write on public.transactions for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create policy registrations_read on public.event_registrations for select to authenticated
using (public.is_app_admin() or user_id = auth.uid());
create policy registrations_insert on public.event_registrations for insert to authenticated
with check (public.is_active_app_member() and user_id = auth.uid());
create policy registrations_update on public.event_registrations for update to authenticated
using (public.is_app_admin() or user_id = auth.uid()) with check (public.is_app_admin() or user_id = auth.uid());
create policy registrations_admin_delete on public.event_registrations for delete to authenticated using (public.is_app_admin());

create policy tees_read on public.tee_assignments for select to authenticated using (
  public.is_app_admin() or exists(
    select 1 from public.members m where m.id = member_id and lower(m.email) = lower(auth.jwt()->>'email')
  )
);
create policy tees_admin_write on public.tee_assignments for all to authenticated
using (public.is_app_admin()) with check (public.is_app_admin());

create policy results_member_read on public.event_results for select to authenticated
using (public.is_active_app_member() and exists(select 1 from public.events e where e.id = event_id and e.results_published));
create policy results_admin_write on public.event_results for all to authenticated
using (public.is_app_admin()) with check (public.is_app_admin());

create policy push_own on public.push_subscriptions for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_own_read on public.notifications for select to authenticated
using (user_id = auth.uid() or public.is_app_admin());
create policy notifications_own_update on public.notifications for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_admin_write on public.notifications for all to authenticated
using (public.is_app_admin()) with check (public.is_app_admin());
create policy roles_admin_read on public.app_user_roles for select to authenticated using (public.is_app_admin());

revoke all on public.members from anon, authenticated;
grant select, insert, update, delete on public.members to authenticated;
revoke all on public.events, public.transactions from anon;
grant select on public.events, public.transactions to authenticated;
grant insert, update, delete on public.events, public.transactions to authenticated;
grant select, insert, update on public.event_registrations to authenticated;
grant delete on public.event_registrations to authenticated;
grant select, insert, update, delete on public.tee_assignments, public.event_results, public.push_subscriptions, public.notifications to authenticated;
revoke all on public.annual_stableford_ranking from public, anon, authenticated;
revoke all on function public.get_member_directory() from public, anon;
grant execute on function public.get_member_directory() to authenticated;
grant execute on function public.get_my_member_identity() to authenticated;
grant execute on function public.get_events_public() to authenticated;
grant execute on function public.get_annual_stableford_ranking(integer) to authenticated;
grant execute on function public.is_active_member_email(text) to anon, authenticated;
grant execute on function public.is_app_admin() to authenticated;

create or replace function public.toggle_event_registration(p_event_id uuid)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare current_status text; member_uuid uuid; deadline timestamptz; event_capacity integer; active_count integer;
begin
  if not public.is_active_app_member() then raise exception 'Active membership required'; end if;
  select registration_deadline, capacity into deadline, event_capacity from public.events
  where id = p_event_id and status = 'upcoming';
  if not found then raise exception 'Registration is not open'; end if;
  if deadline is not null and now() > deadline then raise exception 'Registration deadline has passed'; end if;
  select id into member_uuid from public.members where lower(email) = lower(auth.jwt()->>'email') limit 1;
  select status into current_status from public.event_registrations where event_id = p_event_id and user_id = auth.uid();
  if current_status = 'registered' then
    update public.event_registrations set status='cancelled', cancelled_at=now(), updated_at=now()
    where event_id=p_event_id and user_id=auth.uid();
    insert into public.notifications(user_id,title,body,event_id)
    select r.user_id, '会员取消报名', coalesce((select name from public.members where id=member_uuid),'会员') || ' 已取消报名', p_event_id
    from public.app_user_roles r where r.role='admin';
    return false;
  end if;
  if event_capacity is not null then
    select count(*) into active_count from public.event_registrations where event_id=p_event_id and status='registered';
    if active_count >= event_capacity then raise exception 'Event is full'; end if;
  end if;
  insert into public.event_registrations(event_id,user_id,member_id,status,cancelled_at)
  values(p_event_id,auth.uid(),member_uuid,'registered',null)
  on conflict(event_id,user_id) do update set status='registered',cancelled_at=null,registered_at=now(),updated_at=now();
  insert into public.notifications(user_id,title,body,event_id)
  select r.user_id, '新的比赛报名', coalesce((select name from public.members where id=member_uuid),'会员') || ' 已报名比赛', p_event_id
  from public.app_user_roles r where r.role='admin';
  return true;
end $$;

grant execute on function public.toggle_event_registration(uuid) to authenticated;

create or replace function public.notify_new_event()
returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
  insert into public.notifications(user_id,title,body,event_id)
  select u.id, 'Under 80 发布了新比赛', new.name || ' · ' || new.date::text, new.id
  from auth.users u join public.members m on lower(m.email)=lower(u.email)
  where m.status='active';
  return new;
end $$;
drop trigger if exists notify_new_event_trigger on public.events;
create trigger notify_new_event_trigger after insert on public.events for each row execute function public.notify_new_event();

create or replace function public.queue_tomorrow_event_reminders()
returns integer language plpgsql security definer set search_path=public,auth as $$
declare inserted integer;
begin
  insert into public.notifications(user_id,title,body,event_id)
  select r.user_id, '明天比赛提醒', e.name || ' · 开球 ' || coalesce(t.tee_time::text, e.time::text, '待通知') ||
         case when t.tee <> '' then ' · Tee ' || t.tee else '' end, e.id
  from public.events e
  join public.event_registrations r on r.event_id=e.id and r.status='registered'
  left join public.tee_assignments t on t.event_id=e.id and t.member_id=r.member_id
  where e.status='upcoming' and e.date::date = current_date + 1
    and not exists(select 1 from public.notifications n where n.user_id=r.user_id and n.event_id=e.id and n.title='明天比赛提醒');
  get diagnostics inserted = row_count;
  return inserted;
end $$;

create extension if not exists pg_cron;
select cron.schedule('under80-tomorrow-reminders', '0 * * * *', $$select public.queue_tomorrow_event_reminders();$$)
where not exists(select 1 from cron.job where jobname='under80-tomorrow-reminders');
