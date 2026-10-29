<template>
  <header class="topbar">
    <div class="row-tight">
      <q-btn
        class="mobile-menu btn-icon"
        flat
        round
        dense
        icon="menu"
        aria-label="Ouvrir le menu"
        @click="ui.toggleSidebar"
      />
      <div>
        <div class="topbar-title">{{ pageTitle }}</div>
        <div class="topbar-sub">{{ today }} · Données synchronisées toutes les 30 s</div>
      </div>
    </div>

    <div class="topbar-actions">
      <q-btn
        class="btn-icon"
        flat
        round
        dense
        :icon="themeIcon"
        :aria-label="theme.theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'"
        @click="theme.toggle()"
      >
        <q-tooltip :delay="400">Changer de thème</q-tooltip>
      </q-btn>

      <UiButton icon="add" label="Nouvelle session" @click="newSession" />
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from 'src/stores/theme-store'
import { useUiStore } from 'src/stores/ui-store'
import { UiButton } from 'src/components/ui'

const theme = useThemeStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const titles = {
  '/dashboard': 'Tableau de bord',
  '/sessions': 'Sessions de jeu',
  '/reservations': "File d'attente & réservations",
  '/salles': 'Salles & Postes',
  '/jeux': 'Jeux & Tarifs',
  '/materiels': 'Matériels',
  '/tournois': 'Tournois',
  '/comptes': 'Comptes',
  '/paiements': 'Paiements jeton',
  '/caisse': 'Caisse — rapport Z',
  '/abonnements': 'Abonnements',
  '/audit': "Journal d'audit",
  '/ui-kit': 'Design system',
}

const pageTitle = computed(() => titles[route.path] || 'Aluka Game Zone')
const themeIcon = computed(() => (theme.theme === 'dark' ? 'light_mode' : 'dark_mode'))

const today = computed(() =>
  new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date()),
)

function newSession() {
  ui.requestNewSessionOpen()
  if (route.path !== '/dashboard') router.push('/dashboard')
}
</script>

<style scoped>
.mobile-menu {
  display: none;
}
</style>
