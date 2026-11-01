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
        v-if="auth.isBoss"
        class="btn-icon"
        flat
        round
        dense
        icon="notifications"
        aria-label="Notifications d’abonnement"
        to="/mon-abonnement"
      >
        <q-badge v-if="billing.nonLues" color="negative" floating>{{ billing.nonLues }}</q-badge>
        <q-tooltip :delay="400">Notifications d’abonnement</q-tooltip>
      </q-btn>

      <q-btn
        v-if="auth.isBoss && billing.etat"
        class="topbar-billing"
        flat
        dense
        no-caps
        to="/mon-abonnement"
      >
        <span class="billing-dot" :class="billingTone" />
        <span class="billing-text">{{ billingText }}</span>
      </q-btn>

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
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from 'src/stores/theme-store'
import { useUiStore } from 'src/stores/ui-store'
import { useAuthStore } from 'src/stores/auth-store'
import { useBillingStore } from 'src/stores/billing-store'
import { UiButton } from 'src/components/ui'

const theme = useThemeStore()
const ui = useUiStore()
const auth = useAuthStore()
const billing = useBillingStore()
const route = useRoute()
const router = useRouter()

const billingTone = computed(() => {
  if (billing.isExpired) return 'is-expired'
  if (billing.daysLeft <= 3) return 'is-warning'
  if (billing.isTrial) return 'is-trial'
  return 'is-ok'
})

const billingText = computed(() => {
  if (billing.isExpired) return 'Abonnement expiré'
  if (billing.isTrial) return `Essai · ${billing.daysLeft} j`
  return `Abonnement · ${billing.daysLeft} j`
})

let interval = null
onMounted(() => {
  if (auth.isBoss) {
    interval = setInterval(() => billing.refreshNotifications(), 60_000)
  }
})
onUnmounted(() => {
  if (interval) clearInterval(interval)
})

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
  '/abonnements': 'Abonnements SaaS',
  '/audit': "Journal d'audit",
  '/mon-abonnement': 'Mon abonnement',
}

const pageTitle = computed(() => {
  if (route.path.startsWith('/tournois/')) return 'Tableau du tournoi'
  return titles[route.path] || 'Aluka Game Zone'
})
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
.topbar-billing {
  gap: 7px;
  padding: 6px 10px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: var(--surface-hover);
  color: var(--text-2);
  font-size: 12px;
}
.topbar-billing :deep(.q-btn__content) {
  gap: 7px;
}
.billing-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ok);
  box-shadow: 0 0 0 3px rgba(61, 220, 151, 0.14);
}
.billing-dot.is-trial {
  background: var(--info);
  box-shadow: 0 0 0 3px rgba(90, 169, 255, 0.16);
}
.billing-dot.is-warning {
  background: var(--warn);
  box-shadow: 0 0 0 3px rgba(245, 181, 68, 0.18);
}
.billing-dot.is-expired {
  background: var(--danger);
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.18);
}
.billing-text {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
@media (max-width: 720px) {
  .topbar-billing {
    display: none;
  }
}
</style>
