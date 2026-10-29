<template>
  <q-layout class="app-shell">
    <div class="app-frame">
      <AppSidebar />

      <div class="app-main">
        <TopBar />

        <q-page-container class="app-content">
          <router-view v-slot="{ Component, route }">
            <motion.div
              :key="route.path"
              :initial="{ opacity: 0, y: 10 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }"
            >
              <component :is="Component" />
            </motion.div>
          </router-view>
        </q-page-container>
      </div>
    </div>

    <transition name="backdrop">
      <div v-if="ui.sidebarOpen" class="sidebar-backdrop" @click="ui.closeSidebar" />
    </transition>
  </q-layout>
</template>

<script setup>
import { motion } from 'motion-v'
import AppSidebar from 'src/components/AppSidebar.vue'
import TopBar from 'src/components/Dashboard/TopBar.vue'
import { useUiStore } from 'src/stores/ui-store'

const ui = useUiStore()
</script>

<style scoped>
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}
</style>
