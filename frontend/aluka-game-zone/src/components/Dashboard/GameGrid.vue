<template>
  <section class="grid-postes">
    <GameCard
      v-for="p in postes"
      :key="p.id || p.name"
      :name="p.name"
      :iconText="p.icon"
      :game="p.game"
      :timeRemaining="p.time"
      :status="p.status"
      :salle="p.salle"
      class="clickable"
      @click="$emit('select', p)"
    />
  </section>
</template>

<script setup>
import GameCard from './GameCard.vue'
defineProps({ postes: { type: Array, default: () => [] } })
defineEmits(['select'])
</script>

<style scoped>
.clickable {
  cursor: pointer;
}
</style>

<style scoped>
.grid-postes {
  width: 100%;
}
</style>
