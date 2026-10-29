<template>
  <aside class="right-panel">
    <section class="panel">
      <div class="panel-title">
        <span>Occupation des postes</span>
        <span class="num" style="color: var(--brand)">{{ occupancyRate }}%</span>
      </div>
      <div class="ui-meter">
        <motion.div
          class="ui-meter__fill"
          :initial="{ width: 0 }"
          :animate="{ width: `${occupancyRate}%` }"
          :transition="{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }"
        />
      </div>
      <div class="row items-center q-mt-sm" style="font-size: 12px; color: var(--text-3)">
        <span>{{ occupancy.occupied }} poste(s) en session</span>
        <span class="spacer" />
        <span>sur {{ occupancy.total }}</span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-title">
        <span>Postes les plus utilisés</span>
        <q-icon name="local_fire_department" size="14px" style="color: var(--warn)" />
      </div>
      <div v-for="(p, i) in topPostes" :key="`${p.nom_poste}-${i}`" class="rank-row">
        <span class="rank-index">{{ i + 1 }}</span>
        <span class="rank-label">{{ p.nom_poste }}</span>
        <span class="rank-value">{{ p.utilisations }}×</span>
      </div>
      <div v-if="!topPostes.length" class="muted" style="font-size: 12.5px">
        Aucune session enregistrée.
      </div>
    </section>

    <section class="panel">
      <div class="panel-title">
        <span>Jeux populaires</span>
        <q-icon name="sports_esports" size="14px" style="color: var(--brand)" />
      </div>
      <div v-for="(j, i) in topJeux" :key="`${j.nom}-${i}`" class="rank-row">
        <span class="rank-index">{{ i + 1 }}</span>
        <span class="rank-label">{{ j.nom }}</span>
        <span class="rank-value">{{ j.utilisations }}×</span>
      </div>
      <div v-if="!topJeux.length" class="muted" style="font-size: 12.5px">
        Aucune session enregistrée.
      </div>
    </section>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { motion } from 'motion-v'

const props = defineProps({
  occupancy: {
    type: Object,
    default: () => ({ occupied: 0, total: 0 }),
  },
  topPostes: { type: Array, default: () => [] },
  topJeux: { type: Array, default: () => [] },
})

const occupancyRate = computed(() => {
  const total = props.occupancy?.total || 0
  if (!total) return 0
  return Math.round(((props.occupancy.occupied || 0) / total) * 100)
})
</script>
