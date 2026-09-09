-- Dispatch queued in-app notifications to Web Push every five minutes.
create extension if not exists pg_net;

create or replace function public.dispatch_pending_push()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  request_id bigint;
  dispatch_secret text;
begin
  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets
  where name = 'under80_push_dispatch_secret'
  limit 1;

  if dispatch_secret is null then
    raise exception 'Push dispatch secret is not configured';
  end if;

  select net.http_post(
    url := 'https://bykfoersygrhtnlueibu.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dispatch-secret', dispatch_secret
    ),
    body := '{}'::jsonb
  ) into request_id;
  return request_id;
end;
$$;

revoke all on function public.dispatch_pending_push() from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'under80-push-dispatch';

select cron.schedule(
  'under80-push-dispatch',
  '*/5 * * * *',
  $$select public.dispatch_pending_push();$$
);
