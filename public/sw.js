// Bright Medical „Mein Programm" — minimaler Service Worker, AUSSCHLIESSLICH für Push.
// BEWUSST KEIN fetch-/Cache-Handler: so kann der SW das Portal niemals offline
// kaputt-cachen (kein versehentliches Ausliefern alter Stände). Nur push + click.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = {} }
  const title = data.title || 'Bright Medical'
  const options = {
    body: data.body || 'Neue Nachricht in Ihrem Bereich „Mein Programm".',
    icon: '/images/portal-icon-192.png',
    badge: '/images/portal-icon-192.png',
    tag: data.tag || 'bright-medical',
    renotify: true,
    data: { url: data.url || '/mein-programm' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/mein-programm'
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientList) {
      if (client.url.includes('/mein-programm') && 'focus' in client) return client.focus()
    }
    if (self.clients.openWindow) return self.clients.openWindow(url)
  })())
})
