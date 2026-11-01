<template>
  <q-layout class="app-shell">
    <div class="app-frame">
      <AppSidebar />

      <div class="app-main">
        <OfflineBanner />
        <TopBar />
        <BillingBanner />

        <q-page-container class="app-content">
          <router-view v-slot="{ Component, route }">
            <!--
              Transition volontairement courte et sans decalage vertical : un
              fondu de 300 ms + un mouvement donnaient l'impression que le clic
              sur le menu « ne repondait pas » instantanement.
            -->
            <motion.div
              :key="route.path"
              :initial="{ opacity: 0 }"
              :animate="{ opacity: 1 }"
              :transition="{ duration: 0.16, ease: 'easeOut' }"
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
import OfflineBanner from 'src/components/OfflineBanner.vue'
import BillingBanner from 'src/components/BillingBanner.vue'
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
