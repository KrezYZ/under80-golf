-- Encrypted-at-rest application snapshots. Only club administrators may access them.
create table if not exists public.backups (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'auto',
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.backups enable row level security;

do $$ declare p record;
begin
  for p in select policyname from pg_policies
    where schemaname='public' and tablename='backups'
  loop execute format('drop policy if exists %I on public.backups', p.policyname); end loop;
end $$;

create policy backups_admin_only on public.backups for all to authenticated
using (public.is_app_admin()) with check (public.is_app_admin());

revoke all on public.backups from anon, authenticated;
grant select, insert, delete on public.backups to authenticated;

insert into public.backups(label, data)
select '升级前完整云端快照 2026-09-09', jsonb_build_object(
  'members', coalesce((select jsonb_agg(m) from public.members m), '[]'::jsonb),
  'events', coalesce((select jsonb_agg(e) from public.events e), '[]'::jsonb),
  'transactions', coalesce((select jsonb_agg(t) from public.transactions t), '[]'::jsonb),
  'registrations', coalesce((select jsonb_agg(r) from public.event_registrations r), '[]'::jsonb),
  'teeAssignments', coalesce((select jsonb_agg(t) from public.tee_assignments t), '[]'::jsonb),
  'eventResults', coalesce((select jsonb_agg(r) from public.event_results r), '[]'::jsonb)
);
