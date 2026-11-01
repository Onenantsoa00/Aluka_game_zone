import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { clientsClaim } from 'workbox-core'

/**
 * Service worker Aluka (P2.13).
 * - App shell precache : l'application demarre hors ligne.
 * - API GET : NetworkFirst (4 s max) puis cache 24 h -> consultation hors ligne.
 * - Fonts : StaleWhileRevalidate.
 * Les mutations (POST/PUT/PATCH/DELETE) ne sont jamais interceptees : aucune
 * operation de caisse n'est rejouee ou inventee hors ligne.
 */
self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

try {
  registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
} catch {
  // Le fallback n'est disponible qu'apres le precache complet (build PWA).
}

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'agz-api-v1',
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 180,
        maxAgeSeconds: 24 * 60 * 60,
      }),
    ],
  }),
)

registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'agz-fonts-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
)

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
