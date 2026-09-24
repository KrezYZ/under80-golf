self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Under 80 Golf', body: '你有一条新通知' };
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: new URL('logo.png', self.registration.scope).href,
    badge: new URL('icon.svg', self.registration.scope).href,
    data: { url: data.url || new URL('#/notifications', self.registration.scope).href }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
