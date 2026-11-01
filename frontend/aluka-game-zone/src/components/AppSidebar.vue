<template>
  <aside class="app-sidebar">
    <router-link to="/dashboard" class="sidebar-brand" @click="closeSidebar">
      <span class="brand-mark">
        <q-icon name="sports_esports" size="20px" />
      </span>
      <span class="brand-text">
        <span class="brand-name">Aluka</span>
        <span class="brand-sub">Game Zone</span>
      </span>
    </router-link>

    <nav class="sidebar-nav">
      <template v-for="group in groups" :key="group.label">
        <div v-if="group.items.length" class="sidebar-section">{{ group.label }}</div>
        <router-link
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          active-class="active"
          @click="closeSidebar"
        >
          <q-icon :name="item.icon" size="18px" />
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
        </router-link>
      </template>
    </nav>

    <div v-if="auth.user" class="sidebar-user">
      <span class="avatar">{{ initials }}</span>
      <div class="who">
        <strong>{{ auth.user.nom || auth.user.username }}</strong>
        <span>{{ roleLabel }}</span>
      </div>
    </div>

    <div class="sidebar-footer">
      <q-btn
        flat
        dense
        icon="logout"
        class="btn-subtle"
        aria-label="Se déconnecter"
        @click="logout"
      >
        <q-tooltip :delay="400">Se déconnecter</q-tooltip>
      </q-btn>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth-store'
import { useUiStore } from 'src/stores/ui-store'
import { useBillingStore } from 'src/stores/billing-store'
import { closeRealtime } from 'src/services/realtime'

const auth = useAuthStore()
const ui = useUiStore()
const billing = useBillingStore()
const router = useRouter()

const navGroups = [
  {
    label: 'Pilotage',
    items: [
      {
        to: '/dashboard',
        label: 'Tableau de bord',
        icon: 'space_dashboard',
        roles: ['admin', 'boss', 'jeton'],
      },
    ],
  },
  {
    label: 'Exploitation',
    items: [
      { to: '/sessions', label: 'Sessions', icon: 'play_circle', roles: ['admin', 'boss', 'jeton'] },
      {
        to: '/reservations',
        label: "File d'attente",
        icon: 'event_seat',
        roles: ['admin', 'boss', 'jeton'],
      },
      { to: '/salles', label: 'Salles & Postes', icon: 'meeting_room', roles: ['admin', 'boss'] },
      { to: '/jeux', label: 'Jeux & Tarifs', icon: 'gamepad', roles: ['admin', 'boss'] },
      {
        to: '/materiels',
        label: 'Matériels',
        icon: 'inventory_2',
        roles: ['admin', 'boss', 'jeton'],
      },
      { to: '/tournois', label: 'Tournois', icon: 'emoji_events', roles: ['admin', 'boss', 'jeton'] },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { to: '/comptes', label: 'Comptes', icon: 'groups', roles: ['admin', 'boss'] },
      { to: '/paiements', label: 'Paiements jeton', icon: 'payments', roles: ['admin', 'boss'] },
      { to: '/caisse', label: 'Caisse (Z)', icon: 'point_of_sale', roles: ['admin', 'boss'] },
      { to: '/mon-abonnement', label: 'Mon abonnement', icon: 'card_membership', roles: ['boss'] },
      {
        to: '/abonnements',
        label: 'Abonnements SaaS',
        icon: 'workspace_premium',
        roles: ['admin'],
      },
      { to: '/audit', label: "Journal d'audit", icon: 'history', roles: ['admin'] },
    ],
  },
]

const groups = computed(() => {
  const role = auth.user?.role || 'jeton'
  return navGroups.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => item.roles.includes(role))
      .map((item) =>
        item.to === '/mon-abonnement' && billing.nonLues
          ? { ...item, badge: billing.nonLues }
          : item,
      ),
  }))
})

const roleLabel = computed(() => {
  const map = { admin: 'Administrateur', boss: 'Entrepreneur', jeton: 'Opérateur' }
  return map[auth.user?.role] || auth.user?.role || ''
})

const initials = computed(() => {
  const name = auth.user?.nom || auth.user?.username || '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
})

function logout() {
  auth.logout()
  billing.reset()
  closeRealtime()
  ui.closeSidebar()
  router.push('/login')
}

function closeSidebar() {
  ui.closeSidebar()
}
</script>
