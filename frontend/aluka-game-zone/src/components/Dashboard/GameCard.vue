<template>
  <div class="game-card">
    <div class="icon">{{ iconText }}</div>
    <div class="meta">
      <div class="name">{{ name }}</div>
      <div v-if="salle" class="salle">{{ salle }}</div>
      <div class="game">{{ game || 'Aucun jeu' }}</div>
      <div class="time">{{ timeRemaining || '' }}</div>
    </div>
    <div>
      <div :class="['status', statusClass]">{{ statusLabel }}</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  iconText: { type: String, default: 'PS' },
  name: { type: String, required: true },
  game: { type: String, default: '' },
  timeRemaining: { type: String, default: '' },
  status: { type: String, default: 'available' },
  salle: { type: String, default: '' },
})

const statusMap = {
  available: { cls: 'available', label: 'Disponible' },
  occupied: { cls: 'occupied', label: 'Occupé' },
  reserved: { cls: 'reserved', label: 'Réservé' },
  off: { cls: 'off', label: 'Hors service' },
}

const statusClass = statusMap[props.status]?.cls || 'available'
const statusLabel = statusMap[props.status]?.label || 'Disponible'
</script>

<style scoped>
.game-card {
  align-items: center;
}
.icon {
  font-weight: 700;
}
.salle {
  font-size: 0.75rem;
  color: var(--dc-accent);
  opacity: 0.8;
}
</style>
