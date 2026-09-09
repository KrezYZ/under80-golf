import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
webpush.setVapidDetails('mailto:yuan_cristina@hotmail.com', publicKey, privateKey);
const db = createClient(url, secret);

Deno.serve(async req => {
  const expected = Deno.env.get('PUSH_DISPATCH_SECRET');
  if (!expected || req.headers.get('x-dispatch-secret') !== expected) return new Response('Unauthorized', { status: 401 });
  const { data: notifications, error } = await db.from('notifications').select('*').is('delivered_at', null).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let sent = 0;
  for (const notification of notifications || []) {
    const { data: subscriptions } = await db.from('push_subscriptions').select('*').eq('user_id', notification.user_id);
    for (const row of subscriptions || []) {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify({ title: notification.title, body: notification.body, url: '/under80-golf/#/notifications' }));
        sent++;
      } catch (pushError) {
        const statusCode = (pushError as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) await db.from('push_subscriptions').delete().eq('id', row.id);
      }
    }
    await db.from('notifications').update({ delivered_at: new Date().toISOString() }).eq('id', notification.id);
  }
  return Response.json({ sent });
});
