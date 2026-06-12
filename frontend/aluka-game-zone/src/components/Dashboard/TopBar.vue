<template>
  <header class="topbar">
    <div style="display: flex; gap: 12px; align-items: center">
      <q-btn flat round dense class="mobile-menu" @click="toggleSidebar">
        <q-icon name="menu" />
      </q-btn>
      <div>
        <div class="title">Gestion de Salle de Jeux</div>
        <div class="muted">Tableau central · Vue en temps réel</div>
      </div>
    </div>
    <div style="display: flex; gap: 8px; align-items: center">
      <q-btn flat round dense @click="toggleTheme">
        <q-icon :name="themeIcon" />
      </q-btn>
      <q-btn class="btn-new" unelevated @click="requestNewSession">+ Nouvelle session</q-btn>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from 'src/stores/theme-store'

const theme = useThemeStore()
const toggleTheme = () => theme.toggle()
const themeIcon = computed(() => (theme.theme === 'dark' ? 'light_mode' : 'dark_mode'))

import { useUiStore } from 'src/stores/ui-store'
const ui = useUiStore()
const toggleSidebar = () => ui.toggleSidebar()
const requestNewSession = () => ui.requestNewSessionOpen()
</script>

<style scoped>
.muted {
  color: var(--dc-text-muted);
  font-size: 0.9rem;
}
.btn-new {
  font-weight: 700;
}
.mobile-menu {
  display: none;
}

@media (max-width: 768px) {
  .mobile-menu {
    display: inline-flex;
  }
}
</style>
