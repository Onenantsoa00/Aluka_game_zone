<template>
  <router-view />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { Notify } from 'quasar'
import { useRouter } from 'vue-router'
import { useThemeStore } from './stores/theme-store'
import { useAuthStore } from './stores/auth-store'
import { useBillingStore } from './stores/billing-store'
import { closeRealtime } from './services/realtime'

const theme = useThemeStore()
const auth = useAuthStore()
const billing = useBillingStore()
const router = useRouter()

/**
 * Un 401 (token expiré / révoqué) doit vider le store, sinon l'interface
 * continue d'afficher la coque connectée avec des données vides.
 */
function onUnauthorized() {
  if (!auth.isLoggedIn && router.currentRoute.value.path === '/login') return
  auth.logout()
  billing.reset()
  closeRealtime()
  if (router.currentRoute.value.path !== '/login') {
    router.replace('/login')
    Notify.create({ type: 'warning', message: 'Session expirée — reconnectez-vous' })
  }
}

/** Jeton renouvele silencieusement : on garde le store synchronise. */
function onTokenRefreshed(event) {
  if (event.detail?.token) auth.setSession(event.detail)
}

/** Abonnement expire (402) : le boss est amene sur son espace de paiement. */
function onSubscriptionExpired(event) {
  const role = auth.role
  if (role === 'boss') {
    if (router.currentRoute.value.path !== '/mon-abonnement') {
      router.replace('/mon-abonnement')
      Notify.create({
        type: 'warning',
        icon: 'card_membership',
        message: event.detail?.message || 'Abonnement expiré — renouvelez votre accès.',
        timeout: 7000,
      })
    }
  } else if (role === 'jeton') {
    Notify.create({
      type: 'warning',
      icon: 'lock_clock',
      message: 'L’abonnement de votre salle a expiré. Contactez votre gérant.',
      timeout: 7000,
    })
  }
  billing.load({ silent: true })
}

/** Lectures servies depuis le cache local : on le signale une fois. */
let offlineNotified = false
function onOfflineData() {
  if (offlineNotified) return
  offlineNotified = true
  Notify.create({
    type: 'info',
    icon: 'cloud_off',
    message: 'Mode hors ligne : affichage des dernières données synchronisées.',
    timeout: 6000,
  })
}

function onOnline() {
  offlineNotified = false
  Notify.create({ type: 'positive', icon: 'wifi', message: 'Connexion rétablie' })
  if (auth.isBoss) billing.load({ silent: true })
}

function onOffline() {
  Notify.create({
    type: 'warning',
    icon: 'wifi_off',
    message: 'Vous êtes hors ligne — consultation seule.',
  })
}

onMounted(() => {
  theme.apply()
  window.addEventListener('agz:unauthorized', onUnauthorized)
  window.addEventListener('agz:token-refreshed', onTokenRefreshed)
  window.addEventListener('agz:subscription-expired', onSubscriptionExpired)
  window.addEventListener('agz:offline-data', onOfflineData)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  if (auth.isLoggedIn) {
    auth.refreshProfile()
    if (auth.isBoss) billing.load({ silent: true })
  }
})

onUnmounted(() => {
  window.removeEventListener('agz:unauthorized', onUnauthorized)
  window.removeEventListener('agz:token-refreshed', onTokenRefreshed)
  window.removeEventListener('agz:subscription-expired', onSubscriptionExpired)
  window.removeEventListener('agz:offline-data', onOfflineData)
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>
