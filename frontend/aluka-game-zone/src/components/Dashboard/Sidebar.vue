<template>
  <aside class="sidebar fade-in">
    <div class="logo">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#4FD1FF" /></svg
      ><span>Game Center</span>
    </div>
    <div class="search">
      <q-input dense rounded placeholder="Rechercher..." clearable v-model="q" />
    </div>
    <nav class="menu">
      <div
        v-for="item in items"
        :key="item.key"
        :class="['item', { active: item.key === active }]"
        @click="$emit('navigate', item.key)"
      >
        <q-icon :name="item.icon" />
        <div>{{ item.label }}</div>
      </div>
    </nav>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
defineOptions({ name: 'DashboardSidebar' })
const q = ref('')
const qInput = q
const items = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'dashboard' },
  { key: 'consoles', label: 'Consoles', icon: 'sports_esports' },
  { key: 'jeux', label: 'Jeux', icon: 'gamepad' },
  { key: 'clients', label: 'Clients', icon: 'groups' },
  { key: 'reservations', label: 'Réservations', icon: 'event' },
  { key: 'sessions', label: 'Sessions en cours', icon: 'play_circle' },
  { key: 'paiements', label: 'Paiements', icon: 'payments' },
  { key: 'employes', label: 'Employés', icon: 'badge' },
  { key: 'rapports', label: 'Rapports', icon: 'insights' },
  { key: 'settings', label: 'Paramètres', icon: 'settings' },
]
defineProps({ active: { type: String, default: 'dashboard' } })
</script>

<style scoped>
.sidebar {
  min-height: 320px;
}
.menu .item q-icon {
  color: var(--dc-accent);
}
</style>
