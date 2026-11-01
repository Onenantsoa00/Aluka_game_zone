<template>
  <transition name="offline-slide">
    <div v-if="offline" class="offline-bar" role="status">
      <q-icon name="cloud_off" size="16px" />
      <span>
        <strong>Mode hors ligne.</strong>
        Les données affichées proviennent du dernier chargement ; les encaissements et
        modifications sont désactivés jusqu’au retour du réseau.
      </span>
    </div>
  </transition>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const offline = ref(typeof navigator !== 'undefined' ? navigator.onLine === false : false)

function update() {
  offline.value = navigator.onLine === false
}

onMounted(() => {
  update()
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
})

onUnmounted(() => {
  window.removeEventListener('online', update)
  window.removeEventListener('offline', update)
})
</script>

<style scoped>
.offline-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px clamp(16px, 2.2vw, 32px);
  background: rgba(245, 181, 68, 0.14);
  border-bottom: 1px solid rgba(245, 181, 68, 0.28);
  color: var(--text-1);
  font-size: 12.5px;
  line-height: 1.4;
}
.offline-bar :deep(.q-icon) {
  color: var(--warn);
  flex: none;
}
.offline-bar strong {
  font-weight: 600;
}
.offline-slide-enter-active,
.offline-slide-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.offline-slide-enter-from,
.offline-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
