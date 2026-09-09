import { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead, savePushSubscription, type AppNotification } from '../db';
import { useT } from '../i18n/useT';

const VAPID_PUBLIC_KEY = 'BDPNpf2gPXfe4KGP4Qa1D8I_lx3rPzMnJ7ugE3pBxZ3pTlm2qWsrAwY27EAZ2ajPVcXtqvDckr5gNMTA1pcIuEc';

function decodeBase64Url(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const binary = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...binary].map(character => character.charCodeAt(0)));
}

export default function Notifications() {
  const { t } = useT();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [status, setStatus] = useState<NotificationPermission>(() => 'Notification' in window ? Notification.permission : 'default');
  const [message, setMessage] = useState('');
  const load = () => getNotifications().then(setItems);
  useEffect(() => { void load(); }, []);

  const enablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setMessage(t('notifications_unsupported')); return;
    }
    const permission = await Notification.requestPermission();
    setStatus(permission);
    if (permission !== 'granted') { setMessage(t('notifications_allow')); return; }
    const registration = await navigator.serviceWorker.register('/under80-golf/sw.js');
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeBase64Url(VAPID_PUBLIC_KEY) });
    await savePushSubscription(subscription);
    setMessage(t('notifications_enabled'));
  };

  const read = async (item: AppNotification) => {
    if (!item.read_at) { await markNotificationRead(item.id); load(); }
  };

  return <div className="page" style={{ paddingBottom: 90 }}>
    <div className="page-header"><h1 className="page-title">🔔 {t('notifications_title')}</h1></div>
    <div className="card">
      <strong>{t('notifications_push')}：{status === 'granted' ? t('notifications_on') : t('notifications_off')}</strong>
      <p style={{ color: '#777', fontSize: 12 }}>{t('notifications_ios_hint')}</p>
      <button className="btn btn-primary btn-block" onClick={enablePush}>{t('notifications_enable')}</button>
      {message && <div style={{ color: '#2E7D32', textAlign: 'center', marginTop: 8 }}>{message}</div>}
    </div>
    {items.map(item => <button key={item.id} className="card" onClick={() => read(item)} style={{ display: 'block', width: '100%', textAlign: 'left', border: item.read_at ? undefined : '1px solid #66BB6A' }}>
      <strong>{item.title}</strong><div style={{ marginTop: 4 }}>{item.body}</div><div style={{ color: '#999', fontSize: 11, marginTop: 6 }}>{new Date(item.created_at).toLocaleString()}</div>
    </button>)}
    {!items.length && <div className="empty-state">{t('notifications_empty')}</div>}
  </div>;
}
