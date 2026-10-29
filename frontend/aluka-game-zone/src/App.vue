<template>
  <router-view />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { Notify } from 'quasar'
import { useRouter } from 'vue-router'
import { useThemeStore } from './stores/theme-store'
import { useAuthStore } from './stores/auth-store'
import { closeRealtime } from './services/realtime'

const theme = useThemeStore()
const auth = useAuthStore()
const router = useRouter()

/**
 * Un 401 (token expiré / révoqué) doit vider le store, sinon l'interface
 * continue d'afficher la coque connectée avec des données vides.
 */
function onUnauthorized() {
  if (!auth.isLoggedIn && router.currentRoute.value.path === '/login') return
  auth.logout()
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

onMounted(() => {
  theme.apply()
  window.addEventListener('agz:unauthorized', onUnauthorized)
  window.addEventListener('agz:token-refreshed', onTokenRefreshed)
})

onUnmounted(() => {
  window.removeEventListener('agz:unauthorized', onUnauthorized)
  window.removeEventListener('agz:token-refreshed', onTokenRefreshed)
})
</script>
