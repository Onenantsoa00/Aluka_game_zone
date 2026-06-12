<template>
  <q-layout view="hHh lpR lFf" class="app-shell">
    <div class="app-shell-inner">
      <AppSidebar />
      <q-page-container class="app-content">
        <router-view />
      </q-page-container>
    </div>
  </q-layout>
</template>

<script setup>
import AppSidebar from 'src/components/AppSidebar.vue'
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
