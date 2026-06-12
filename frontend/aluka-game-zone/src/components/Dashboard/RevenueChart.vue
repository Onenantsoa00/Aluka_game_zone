<template>
  <div class="dc-card">
    <div class="muted q-mb-sm">Recettes par salle</div>
    <div v-if="items.length" class="chart-bars">
      <div v-for="item in items" :key="item.nom" class="chart-bar-col">
        <div class="chart-bar-value">{{ formatShort(item.montant) }}</div>
        <div class="chart-bar" :style="{ height: barHeight(item.montant) + 'px' }" />
        <div class="chart-bar-label">{{ item.nom }}</div>
      </div>
    </div>
    <div v-else class="muted">Aucune donnée de recette</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
})

const items = computed(() =>
  (props.data || []).slice(0, 6).map((d) => ({
    nom: d.nom,
    montant: Number(d.montant) || 0,
  })),
)

const maxVal = computed(() => Math.max(...items.value.map((i) => i.montant), 1))

function barHeight(val) {
  return Math.max(8, (val / maxVal.value) * 100)
}

function formatShort(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}
</script>

<style scoped>
.muted {
  color: var(--dc-text-muted);
}
</style>
