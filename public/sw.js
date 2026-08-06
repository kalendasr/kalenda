/*
 * Service worker voor Kalenda — UITSLUITEND voor pushmeldingen.
 *
 * Er is met opzet GEEN `fetch`-handler: deze worker cachet niets. Voeg er ook
 * geen toe — offline-caching hier zou verouderde pagina's opleveren en is een
 * heel andere verantwoordelijkheid dan meldingen tonen.
 *
 * Het bestand moet op de oorsprong-root (/sw.js) staan: de scope van een service
 * worker reikt nooit hoger dan zijn eigen pad.
 */

// Meteen actief worden, zonder op een herstart van het tabblad te wachten.
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Inkomende push → een melding tonen. Safari trekt de toestemming in als je een
// push ontvangt zónder iets te tonen; daarom tonen we ALTIJD iets, ook als de
// payload onleesbaar is.
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Kalenda',
    body: 'Je hebt een nieuwe melding.',
    url: '/',
    tag: 'kalenda',
  }
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() }
    }
  } catch (err) {
    // Onleesbare payload: val terug op de generieke melding hierboven.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: payload.tag,
      data: { url: payload.url },
    }),
  )
})

// Klik op de melding → bestaand tabblad focussen en navigeren, anders een nieuw
// venster openen op de deeplink.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          // Zelfde oorsprong → hergebruik dit tabblad.
          if ('focus' in client) {
            client.focus()
            if ('navigate' in client) client.navigate(targetUrl)
            return
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
      }),
  )
})
