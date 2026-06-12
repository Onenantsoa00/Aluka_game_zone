<template>
  <aside class="sidebar app-sidebar">
    <div class="logo">
      <q-icon name="sports_esports" size="22px" color="cyan-4" />
      <span>Aluka Game Zone</span>
    </div>

    <div v-if="auth.user" class="user-badge">
      <q-icon name="person" size="16px" />
      <div>
        <div class="user-name">{{ auth.user.nom || auth.user.username }}</div>
        <div class="user-role">{{ roleLabel }}</div>
      </div>
    </div>

    <nav class="menu">
      <router-link
        v-for="item in visibleItems"
        :key="item.to"
        :to="item.to"
        class="item"
        active-class="active"
        @click="closeSidebar"
      >
        <q-icon :name="item.icon" size="20px" />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <q-btn flat dense icon="logout" label="Déconnexion" class="logout-btn" @click="logout" />
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth-store'

const auth = useAuthStore()
const router = useRouter()
import { useUiStore } from 'src/stores/ui-store'
const ui = useUiStore()

const allItems = [
  {
    to: '/dashboard',
    label: 'Tableau de bord',
    icon: 'dashboard',
    roles: ['admin', 'boss', 'jeton'],
  },
  { to: '/sessions', label: 'Sessions', icon: 'play_circle', roles: ['admin', 'boss', 'jeton'] },
  { to: '/salles', label: 'Salles & Postes', icon: 'meeting_room', roles: ['admin', 'boss'] },
  { to: '/jeux', label: 'Jeux & Tarifs', icon: 'gamepad', roles: ['admin', 'boss'] },
  { to: '/materiels', label: 'Matériels', icon: 'inventory_2', roles: ['admin', 'boss', 'jeton'] },
  { to: '/tournois', label: 'Tournois', icon: 'emoji_events', roles: ['admin', 'boss', 'jeton'] },
  { to: '/comptes', label: 'Comptes', icon: 'groups', roles: ['admin', 'boss'] },
  { to: '/paiements', label: 'Paiements jeton', icon: 'payments', roles: ['admin', 'boss'] },
  { to: '/abonnements', label: 'Abonnements', icon: 'card_membership', roles: ['admin'] },
]

const roleLabel = computed(() => {
  const map = { admin: 'Administrateur', boss: 'Entrepreneur', jeton: 'Jeton' }
  return map[auth.user?.role] || auth.user?.role || ''
})

const visibleItems = computed(() => {
  const role = auth.user?.role || 'jeton'
  return allItems.filter((it) => it.roles.includes(role))
})

function logout() {
  auth.logout()
  router.push('/login')
}

function closeSidebar() {
  ui.closeSidebar()
}
</script>

<style scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 240px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  border-radius: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.04);
  border-left: none;
  border-top: none;
  border-bottom: none;
}

.user-badge {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  margin: 12px 0;
  border-radius: 10px;
  background: rgba(79, 209, 255, 0.06);
  color: var(--dc-text-muted);
  font-size: 0.85rem;
}
.user-name {
  color: var(--dc-text);
  font-weight: 600;
}
.user-role {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--dc-accent);
}

.menu {
  flex: 1;
}
.menu .item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--dc-text-muted);
  text-decoration: none;
  transition: all 0.18s ease;
  margin-bottom: 4px;
}
.menu .item.active {
  background: rgba(79, 209, 255, 0.1);
  color: var(--dc-accent);
  box-shadow: var(--dc-neon);
}
.menu .item:hover {
  transform: translateX(4px);
  color: var(--dc-text);
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}
.logout-btn {
  color: var(--dc-text-muted);
  width: 100%;
  justify-content: flex-start;
}
</style>
