import { Notify } from 'quasar'

/**
 * Enregistrement du service worker PWA (P2.13).
 * Quasar n'injecte ce fichier qu'en mode PWA (`quasar dev -m pwa` /
 * `quasar build -m pwa`), donc l'application SPA classique reste inchangee.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(process.env.SERVICE_WORKER_FILE)
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          if (!worker) return
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              Notify.create({
                type: 'info',
                icon: 'system_update',
                message: 'Nouvelle version disponible.',
                timeout: 12000,
                actions: [
                  {
                    label: 'Recharger',
                    color: 'white',
                    handler: () => {
                      registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
                      window.location.reload()
                    },
                  },
                ],
              })
            }
          })
        })
      })
      .catch((error) => {
        console.warn('Service worker non enregistré', error)
      })
  })
}
