<template>
  <q-layout view="hHh lpR lFf" class="app-shell">
    <div class="app-shell-inner">
      <AppSidebar />
      <div class="app-main">
        <TopBar />
        <q-page-container class="app-content">
          <router-view />
        </q-page-container>
      </div>
    </div>
    <div v-if="ui.sidebarOpen" class="sidebar-backdrop" @click="ui.closeSidebar" />
  </q-layout>
</template>

<script setup>
import AppSidebar from 'src/components/AppSidebar.vue'
import { useUiStore } from 'src/stores/ui-store'
import TopBar from 'src/components/Dashboard/TopBar.vue'

const ui = useUiStore()
</script>

<style scoped>
.app-shell {
  background: var(--dc-bg);
  min-height: 100vh;
}
.app-shell-inner {
  display: flex;
  min-height: 100vh;
}
.app-content {
  flex: 1;
  min-width: 0;
}
</style>
