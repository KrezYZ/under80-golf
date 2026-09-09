self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Under 80 Golf', body: '你有一条新通知' };
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/under80-golf/logo.png',
    badge: '/under80-golf/icon.svg',
    data: { url: data.url || '/under80-golf/#/notifications' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
