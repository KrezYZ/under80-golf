-- Store surname and given name separately while retaining the legacy display name.
alter table public.members add column if not exists last_name text;
alter table public.members add column if not exists first_name text;

create or replace function public.get_member_directory()
returns table(id uuid, name text, licencia text)
language sql stable security definer set search_path = public
as $$
  select m.id, m.name, m.licencia from public.members m
  where public.is_active_app_member()
  order by m.last_name nulls last, m.first_name nulls last, m.name;
$$;
