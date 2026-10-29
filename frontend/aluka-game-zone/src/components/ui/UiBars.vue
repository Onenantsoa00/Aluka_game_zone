<template>
  <div v-if="series.length" class="chart-bars">
    <div v-for="(item, index) in series" :key="item.label" class="chart-bar-col">
      <div class="chart-bar-value">{{ formatShort(item.value) }}</div>
      <motion.div
        class="chart-bar"
        :initial="{ height: 0, opacity: 0 }"
        :animate="{ height: `${barHeight(item.value)}%`, opacity: 1 }"
        :transition="{ duration: 0.6, delay: 0.06 * index, ease: [0.32, 0.72, 0, 1] }"
        :title="`${item.label} — ${formatShort(item.value)}`"
      />
      <div class="chart-bar-label">{{ item.label }}</div>
    </div>
  </div>
  <UiEmptyState
    v-else
    icon="bar_chart"
    title="Aucune recette"
    text="Les recettes apparaîtront ici dès la première session encaissée."
  />
</template>

<script setup>
import { computed } from 'vue'
import { motion } from 'motion-v'
import UiEmptyState from './UiEmptyState.vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  labelKey: { type: String, default: 'nom' },
  valueKey: { type: String, default: 'montant' },
  limit: { type: Number, default: 6 },
})

const series = computed(() =>
  (props.data || []).slice(0, props.limit).map((row) => ({
    label: row[props.labelKey] || '—',
    value: Number(row[props.valueKey]) || 0,
  })),
)

const maxVal = computed(() => Math.max(...series.value.map((s) => s.value), 1))

function barHeight(value) {
  return Math.max(6, (value / maxVal.value) * 100)
}

function formatShort(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.0', '')}M`
  if (n >= 10000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`
  return String(Math.round(n))
}
</script>
