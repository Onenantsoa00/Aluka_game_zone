<template>
  <motion.article
    class="poste-card"
    :style="{ '--tone': tone }"
    :initial="{ opacity: 0, y: 12 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.34, delay: 0.03 * index, ease: [0.32, 0.72, 0, 1] }"
    :while-hover="{ y: -3 }"
    tabindex="0"
    role="button"
    :aria-label="`${name} — ${statusLabel}${game ? ` — ${game}` : ''}`"
    @click="$emit('select')"
    @keydown.enter.prevent="$emit('select')"
    @keydown.space.prevent="$emit('select')"
  >
    <div class="poste-card__top">
      <span class="poste-card__icon">{{ iconText }}</span>
      <div style="min-width: 0; flex: 1">
        <div class="poste-card__name">{{ name }}</div>
        <div class="poste-card__room">
          {{ salle || 'Salle non renseignée' }}<template v-if="consoleName">
            · {{ consoleName }}</template
          >
        </div>
      </div>
      <UiBadge :tone="statusTone" :label="statusLabel" />
    </div>

    <div class="poste-card__meta">
      <span :title="game || 'Aucun jeu démarré'">{{ game || 'Aucun jeu démarré' }}</span>
      <span
        v-if="timeRemaining"
        class="poste-card__time"
        :style="overtime ? { color: 'var(--danger)' } : null"
      >
        <q-icon v-if="overtime" name="notification_important" size="13px" />
        {{ timeRemaining }}
      </span>
    </div>

    <div class="poste-card__hint">
      {{ hint }}
    </div>
  </motion.article>
</template>

<script setup>
import { computed } from 'vue'
import { motion } from 'motion-v'
import { UiBadge } from 'src/components/ui'

const props = defineProps({
  iconText: { type: String, default: '??' },
  name: { type: String, required: true },
  game: { type: String, default: '' },
  timeRemaining: { type: String, default: '' },
  overtime: { type: Boolean, default: false },
  status: { type: String, default: 'available' },
  salle: { type: String, default: '' },
  consoleName: { type: String, default: '' },
  index: { type: Number, default: 0 },
})

defineEmits(['select'])

const statusMap = {
  available: { tone: 'ok', label: 'Disponible', color: 'var(--ok)' },
  occupied: { tone: 'brand', label: 'En session', color: 'var(--brand)' },
  reserved: { tone: 'warn', label: 'En pause', color: 'var(--warn)' },
  off: { tone: 'neutral', label: 'Hors service', color: 'var(--text-3)' },
}

const current = computed(() => statusMap[props.status] || statusMap.available)
const statusTone = computed(() => current.value.tone)
const statusLabel = computed(() => current.value.label)
const tone = computed(() => current.value.color)

const hint = computed(() => {
  if (props.overtime) return 'Temps payé dépassé — prolonger ou terminer'
  if (props.status === 'occupied' || props.status === 'reserved') return 'Cliquer pour gérer la session'
  if (props.status === 'off') return 'Poste désactivé ou indisponible'
  return 'Cliquer pour démarrer une session'
})
</script>
